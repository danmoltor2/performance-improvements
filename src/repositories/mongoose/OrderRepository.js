import mongoose from 'mongoose'
import moment from 'moment'
import RepositoryBase from '../RepositoryBase.js'
import OrderMongoose from './models/OrderMongoose.js'

class OrderRepository extends RepositoryBase {
  async findById (id) {
    try {
      return OrderMongoose.findById(id)
    } catch (err) {
      return null
    }
  }

  async findByRestaurantId (restaurantId, paginated = false, page = 1, limit = 10) {
    if (paginated) {
      return await this.#findByRestaurantIdPaginated(page, limit, restaurantId)
    } else {
      return OrderMongoose.find({ _restaurantId: restaurantId })
    }
  }

  async #findByRestaurantIdPaginated (page, limit, restaurantId) {
    const skip = (page - 1) * limit
    const [orders, total] = await Promise.all([
      OrderMongoose.find({ _restaurantId: restaurantId })
        .sort('-createdAt')
        .skip(skip)
        .limit(limit)
        .exec(),
      OrderMongoose.countDocuments({ _restaurantId: restaurantId }).exec()
    ])
    return {
      items: orders,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    }
  }

  async indexCustomer (customerId, page = 1, limit = 10) {
    const skip = (page - 1) * limit
    const [orders, total] = await Promise.all([
      OrderMongoose.find({ _userId: customerId })
        .sort('-createdAt')
        .skip(skip)
        .limit(limit)
        .populate('restaurant')
        .exec(),
      OrderMongoose.countDocuments({ _userId: customerId }).exec()
    ])
    return {
      items: orders,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    }
  }

  formatOrderProducts (orderData) {
    return orderData.products.map(orderDataProductDTO => ({
      name: orderDataProductDTO.name,
      image: orderDataProductDTO.image,
      quantity: orderDataProductDTO.quantity,
      unityPrice: orderDataProductDTO.unityPrice,
      _id: orderDataProductDTO.id
    }))
  }

  async create (orderData) {
    orderData.products = this.formatOrderProducts(orderData)
    const newOrderMongoose = new OrderMongoose(orderData)
    return newOrderMongoose.save()
  }

  async update (id, orderData) {
    orderData.products = this.formatOrderProducts(orderData)
    return OrderMongoose.findByIdAndUpdate(id, orderData, { new: true })
  }

  async destroy (id) {
    const deletedResult = await OrderMongoose.findByIdAndDelete(id)
    return deletedResult !== null
  }

  async save (entity) {
    entity.products = entity.products.map(product => ({
      ...product,
      _id: product.id || product._id
    }))
    return OrderMongoose.findByIdAndUpdate(entity.id, entity, { upsert: true, new: true })
  }

  async analytics (restaurantId) {
    const yesterdayZeroHours = moment().subtract(1, 'days').startOf('day').toDate()
    const todayZeroHours = moment().startOf('day').toDate()
    const restaurantObjectId = new mongoose.Types.ObjectId(restaurantId)

    const [result] = await OrderMongoose.aggregate([
      {
        $match: { _restaurantId: restaurantObjectId }
      },
      {
        $facet: {
          numYesterdayOrders: [
            { $match: { createdAt: { $gte: yesterdayZeroHours, $lt: todayZeroHours } } },
            { $count: 'count' }
          ],
          numPendingOrders: [
            { $match: { startedAt: { $exists: false } } },
            { $count: 'count' }
          ],
          numDeliveredTodayOrders: [
            { $match: { deliveredAt: { $gte: todayZeroHours } } },
            { $count: 'count' }
          ],
          invoicedToday: [
            { $match: { startedAt: { $gte: todayZeroHours } } },
            { $group: { _id: null, total: { $sum: '$price' } } }
          ]
        }
      },
      {
        $project: {
          numYesterdayOrders: { $ifNull: [{ $arrayElemAt: ['$numYesterdayOrders.count', 0] }, 0] },
          numPendingOrders: { $ifNull: [{ $arrayElemAt: ['$numPendingOrders.count', 0] }, 0] },
          numDeliveredTodayOrders: { $ifNull: [{ $arrayElemAt: ['$numDeliveredTodayOrders.count', 0] }, 0] },
          invoicedToday: { $ifNull: [{ $arrayElemAt: ['$invoicedToday.total', 0] }, 0] }
        }
      }
    ]).exec()

    return {
      restaurantId,
      numYesterdayOrders: result.numYesterdayOrders,
      numPendingOrders: result.numPendingOrders,
      numDeliveredTodayOrders: result.numDeliveredTodayOrders,
      invoicedToday: result.invoicedToday
    }
  }
}
export default OrderRepository
