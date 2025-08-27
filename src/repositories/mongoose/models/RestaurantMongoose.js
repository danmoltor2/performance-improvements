import mongoose, { Schema } from 'mongoose'
import moment from 'moment'
import ProductSchema from './ProductMongoose.js'
import OrderMongoose from './OrderMongoose.js'

const restaurantSchema = new Schema({
  name: { type: String, required: 'Kindly enter the restaurant name' },
  description: { type: String },
  address: { type: String, required: 'Kindly enter the restaurant name' },
  postalCode: { type: String, required: 'Kindly enter the restaurant postal code' },
  url: { type: String },
  shippingCosts: { type: Number, required: 'Kindly enter the shipping costs', min: 0 },
  averageServiceMinutes: { type: Number },
  email: { type: String },
  phone: { type: String },
  logo: { type: String },
  heroImage: { type: String },
  status: { type: String, enum: ['online', 'offline', 'closed', 'temporarily closed'] },
  _restaurantCategoryId: { type: Schema.Types.ObjectId, required: 'Kindly select the restaurant category', ref: 'RestaurantCategory' },
  _userId: { type: Schema.Types.ObjectId, required: 'Kindly select the restaurant owner', ref: 'User' },
  products: [ProductSchema]
}, {
  virtuals: {
    userId: {
      get () { return this._userId?.toString() },
      set (userId) { this._userId = userId }
    },
    restaurantCategoryId: {
      get () { return this._restaurantCategoryId?.toString() },
      set (restaurantCategoryId) { this._restaurantCategoryId = restaurantCategoryId }
    }
  },
  methods: {
    async getAverageServiceTime () {
      const restaurantOrders = await OrderMongoose.find({ _restaurantId: this.id }).lean()
      if (!restaurantOrders.length) return null

      const totalTime = restaurantOrders.reduce((acc, order) => {
        if (order.deliveredAt) {
          return acc + moment(order.deliveredAt).diff(moment(order.createdAt), 'minutes')
        }
        return acc
      }, 0)

      return totalTime / restaurantOrders.length || null
    }
  },
  strict: false,
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_, resultObject) => {
      ['_id', '__v', '_userId', '_restaurantCategoryId'].forEach(field => delete resultObject[field])
      return resultObject
    }
  }
})

restaurantSchema.virtual('restaurantCategory', {
  ref: 'RestaurantCategory',
  localField: '_restaurantCategoryId',
  foreignField: '_id'
})

export default mongoose.model('Restaurant', restaurantSchema, 'restaurants')
