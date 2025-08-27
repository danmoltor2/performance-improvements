import logging
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import Dict, List
from datetime import datetime

import pandas as pd

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class DatabaseType(Enum):
    MONGODB_ATLAS = "mongodb+srv"
    MONGODB = "mongodb"
    MARIADB = "mariadb"


EXCLUDED_SCOPES = {
    "Files Summary",
    "Test Results",
    "restaurantCategories",
    "productCategories",
}

CORE_SCOPES = {"global", "restaurants", "auth", "users", "orders", "products"}


@dataclass
class Config:
    perf_log_dir: Path = Path("performanceMeasurements/logs")
    results_log_dir: Path = Path("tests/e2e/results")
    output_path: Path = Path("performanceMeasurements/stats.csv")

class PerformanceAnalyzer:
    def __init__(self, config: Config = Config()):
        self.config = config
        self.db_types = [db_type.value for db_type in DatabaseType]

        if self.config.perf_log_dir.exists():
            for log_file in self.config.perf_log_dir.glob("*"):
                try:
                    log_file.unlink()
                    logger.info(f"Deleted log file: {log_file}")
                except Exception as e:
                    logger.warning(f"Failed to delete {log_file}: {e}")
                    
    def _parse_duration(self, duration_str: str) -> float:
        """Parse duration string and convert to milliseconds."""
        try:
            return float(duration_str.replace("ms", "").strip())
        except (ValueError, AttributeError) as e:
            logger.warning(f"Failed to parse duration: {duration_str}. Error: {e}")
            return 0.0
        
    def _clean_scope_name(self, scope_name: str) -> str:
        """Clean scope names by removing .test.js and converting 'Total Tests' to 'global'."""
        scope_name = scope_name.strip()
        if scope_name == "Total Tests":
            return "global"
        return scope_name.replace(".test.js", "")

    def calculate_endpoint_stats(self) -> Dict[str, Dict[str, float]]:
        """Calculate average duration for each endpoint across different databases."""
        endpoints: Dict[str, Dict[str, List[float]]] = {}

        try:
            for log_file in self.config.perf_log_dir.glob("*.csv"):
                df = pd.read_csv(log_file)
                df = df[~df["method"].str.contains("method")]

                for _, row in df.iterrows():
                    endpoint_key = f"{row['method']} - {row['endpoint']}"
                
                    if any(
                        excluded in endpoint_key.lower()
                        for excluded in ["categories", "test"]
                    ):
                        continue

                    if endpoint_key not in endpoints:
                        endpoints[endpoint_key] = {
                            db_type: [] for db_type in self.db_types
                        }

                    for db_type in self.db_types:
                        # Use exact match with word boundaries for db_type
                        if f"{db_type}" in log_file.stem or log_file.stem.endswith(
                            f"{db_type}"
                        ):
                            endpoints[endpoint_key][db_type].append(
                                float(row["duration(ms)"])
                            )

            # Calculate averages
            return {
                endpoint: {
                    db: sum(values) / len(values) if values else None
                    for db, values in db_data.items()
                }
                for endpoint, db_data in endpoints.items()
            }

        except Exception as e:
            logger.error(f"Error calculating endpoint stats: {e}")
            raise

    def calculate_global_stats(self) -> pd.DataFrame:
        """Calculate global performance statistics across different scopes."""
        global_stats = pd.DataFrame(columns=["scope"] + self.db_types)

        try:
            for result_file in self.config.results_log_dir.glob("*.csv"):
                print("Processing file:", result_file)
                content = result_file.read_text().splitlines()

                # Parse scopes from file content
                scopes = {}
                for line in content:
                    if ":" in line:
                        scope_name = line.split(":")[0].strip()
                        cleaned_scope = self._clean_scope_name(scope_name)

                        # Skip excluded scopes
                        if cleaned_scope in EXCLUDED_SCOPES:
                            continue

                        # Only include core scopes
                        if cleaned_scope in CORE_SCOPES:
                            scopes[cleaned_scope] = self._parse_duration(
                                line.split(":")[-1]
                            )
                # Determine database type from filename
                db_type = next(
                    (
                        db
                        for db in self.db_types
                        if f"{db}" in result_file.stem
                        or result_file.stem.endswith(f"{db}")
                    ),
                    None,
                )
                if not db_type:
                    continue

                # Update DataFrame with scope values
                for scope_name, scope_value in scopes.items():
                    if scope_name not in global_stats["scope"].values:
                        new_row = {"scope": scope_name, db_type: scope_value}
                        global_stats = pd.concat(
                            [global_stats, pd.DataFrame([new_row])], ignore_index=True
                        )
                    else:
                        global_stats.loc[
                            global_stats["scope"] == scope_name, db_type
                        ] = scope_value

            # Ensure specific order of scopes
            scope_order = list(CORE_SCOPES)
            global_stats["scope"] = pd.Categorical(
                global_stats["scope"], categories=scope_order, ordered=True
            )
            global_stats = global_stats.sort_values("scope")

            return global_stats

        except Exception as e:
            logger.error(f"Error calculating global stats: {e}")
            raise

    def generate_performance_report(self) -> None:
        """Generate comprehensive performance report."""
        try:
            global_stats = self.calculate_global_stats()
            endpoints = self.calculate_endpoint_stats()

            # Add endpoint statistics to global stats
            endpoint_rows = [
                {
                    "scope": endpoint_name,
                    **{db_type: values.get(db_type) for db_type in self.db_types},
                }
                for endpoint_name, values in endpoints.items()
            ]

            final_stats = pd.concat(
                [global_stats, pd.DataFrame(endpoint_rows)], ignore_index=True
            )

            # Obtener fecha y hora en formato Año-Mes-Día_Hora-Minuto
            date_str = datetime.now().strftime("%Y-%m-%d_%H-%M")

            # Modificar el nombre del archivo para incluir la fecha y hora antes de la extensión
            output_path = self.config.output_path
            new_filename = f"{output_path.stem}_{date_str}{output_path.suffix}"
            output_path_with_date = output_path.parent / new_filename

            # Crear directorios si no existen
            output_path.parent.mkdir(parents=True, exist_ok=True)

            # Guardar el archivo con el nuevo nombre
            final_stats.to_csv(output_path_with_date, index=False)

            logger.info(f"Performance report generated successfully at {output_path_with_date}")

        except Exception as e:
            logger.error(f"Error generating performance report: {e}")
            raise


def main():
    try:
        analyzer = PerformanceAnalyzer()
        analyzer.generate_performance_report()

    except Exception as e:
        logger.error(f"Application error: {e}")
        raise


if __name__ == "__main__":
    main()