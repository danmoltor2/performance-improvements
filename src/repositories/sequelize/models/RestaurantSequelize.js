import moment from 'moment'
import { Model, Sequelize } from 'sequelize'
const loadModel = function (sequelize, DataTypes) {
  class RestaurantSequelize extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate (models) {
      // define association here
      RestaurantSequelize.belongsTo(models.RestaurantCategorySequelize, { foreignKey: 'restaurantCategoryId', as: 'restaurantCategory' })
      RestaurantSequelize.belongsTo(models.UserSequelize, { foreignKey: 'userId', as: 'user' })
      RestaurantSequelize.hasMany(models.ProductSequelize, { foreignKey: 'restaurantId', as: 'products' })
      RestaurantSequelize.hasMany(models.OrderSequelize, { foreignKey: 'restaurantId', as: 'orders' })
    }

    /*
    async getAverageServiceTime () {
      try {
        const orders = await this.getOrders()
        const serviceTimes = orders.filter(o => o.deliveredAt).map(o => moment(o.deliveredAt).diff(moment(o.createdAt), 'minutes'))
        return serviceTimes.reduce((acc, serviceTime) => acc + serviceTime, 0) / serviceTimes.length
      } catch (err) {
        return err
      }
    }
    */
    async getAverageServiceTime () {
      try {
        // Optimización: Consultar solo órdenes entregadas y solo los campos necesarios
        const orders = await sequelize.models.Order.findAll({
          where: {
            restaurantId: this.id,
            deliveredAt: { [Sequelize.Op.ne]: null } // Solo órdenes con deliveredAt
          },
          attributes: ['createdAt', 'deliveredAt'] // Solo los campos necesarios
        })

        // Verificar si hay órdenes
        if (orders.length === 0) return 0

        // Calcular tiempo directamente sin usar map y reduce
        let totalServiceTime = 0
        for (const order of orders) {
          totalServiceTime += moment(order.deliveredAt).diff(moment(order.createdAt), 'minutes')
        }

        return totalServiceTime / orders.length
      } catch (err) {
        console.error('Error calculating average service time:', err)
        return 0 // Devolver 0 en caso de error en lugar del objeto error
      }
    }
  }
  RestaurantSequelize.init({
    name: DataTypes.STRING,
    description: DataTypes.TEXT,
    address: DataTypes.STRING,
    postalCode: DataTypes.STRING,
    url: DataTypes.STRING,
    shippingCosts: DataTypes.DOUBLE,
    averageServiceMinutes: DataTypes.DOUBLE,
    email: DataTypes.STRING,
    phone: DataTypes.STRING,
    logo: DataTypes.STRING,
    heroImage: DataTypes.STRING,
    status: {
      type: DataTypes.ENUM,
      values: [
        'online',
        'offline',
        'closed',
        'temporarily closed'
      ]
    },
    restaurantCategoryId: {
      allowNull: false,
      type: DataTypes.INTEGER
    },
    userId: {
      allowNull: false,
      type: DataTypes.INTEGER
    },
    createdAt: {
      allowNull: false,
      type: DataTypes.DATE,
      defaultValue: new Date()
    },
    updatedAt: {
      allowNull: false,
      type: DataTypes.DATE,
      defaultValue: new Date()
    }
  }, {
    sequelize,
    modelName: 'Restaurant',
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['restaurantCategoryId']
      }
    ]
  })
  return RestaurantSequelize
}
export default loadModel
