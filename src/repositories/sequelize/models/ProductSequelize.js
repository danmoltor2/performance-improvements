import { Model } from 'sequelize'
const loadModel = function (sequelize, DataTypes) {
  class ProductSequelize extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate (models) {
    // define association here
      const OrderProducts = sequelize.define('OrderProducts', {
        quantity: DataTypes.INTEGER,
        unityPrice: DataTypes.DOUBLE
      },
      {
        indexes: [
          {
            fields: ['quantity']
          }
        ]
      })
      ProductSequelize.belongsTo(models.RestaurantSequelize, { foreignKey: 'restaurantId', as: 'restaurant', onDelete: 'cascade' })
      ProductSequelize.belongsTo(models.ProductCategorySequelize, { foreignKey: 'productCategoryId', as: 'productCategory' })
      ProductSequelize.hasMany(models.OrderProductSequelize, { foreignKey: 'productId', as: 'orderProducts' })
      ProductSequelize.belongsToMany(models.OrderSequelize, { as: 'orders', through: OrderProducts })
    }
  }
  ProductSequelize.init({
    name: DataTypes.STRING,
    description: DataTypes.STRING,
    price: DataTypes.DOUBLE,
    image: DataTypes.STRING,
    order: DataTypes.INTEGER,
    availability: DataTypes.BOOLEAN,
    restaurantId: DataTypes.INTEGER,
    productCategoryId: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Product'
  })
  return ProductSequelize
}
export default loadModel
