import { Model } from 'sequelize'
const loadModel = function (sequelize, DataTypes) {
  class OrderProductSequelize extends Model {
    static associate (models) {
      // define association here
      OrderProductSequelize.belongsTo(models.ProductSequelize, { foreignKey: 'productId', as: 'product' })
      OrderProductSequelize.belongsTo(models.OrderSequelize, { foreignKey: 'orderId', as: 'order' })
    }
  }
  OrderProductSequelize.init({
    quantity: DataTypes.INTEGER,
    unityPrice: DataTypes.DOUBLE,
    productId: DataTypes.INTEGER,
    orderId: DataTypes.INTEGER
  },
  {
    indexes: [
      {
        fields: ['quantity', 'productId']
      }
    ],
    sequelize,
    modelName: 'OrderProduct'
  })
  return OrderProductSequelize
}
export default loadModel
