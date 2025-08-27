import mongoose from 'mongoose'
import RepositoryBase from '../RepositoryBase.js'
import RestaurantMongoose from './models/RestaurantMongoose.js'

class RestaurantRepository extends RepositoryBase {
  async findById (id, ...args) {
    try {
      const leanNeeded = args[0]?.lean
      return leanNeeded
        ? await RestaurantMongoose.findById(id).lean()
        : await RestaurantMongoose.findById(id)
    } catch {
      return null
    }
  }

  findAll () {
    return RestaurantMongoose.find().populate('restaurantCategory')
  }

  create (restaurantData) {
    return new RestaurantMongoose(restaurantData).save()
  }

  update (id, restaurantData) {
    return RestaurantMongoose.findByIdAndUpdate(id, restaurantData, { new: true })
  }

  async destroy (id) {
    const result = await RestaurantMongoose.findByIdAndDelete(id)
    return result !== null
  }

  save (entity) {
    return RestaurantMongoose.findByIdAndUpdate(entity.id, entity, { upsert: true, new: true })
  }

  findByOwnerId (ownerId) {
    return RestaurantMongoose.find({ _userId: new mongoose.Types.ObjectId(ownerId) })
      .populate('restaurantCategory')
  }

  show (id) {
    return RestaurantMongoose.findById(id)
      .populate(['restaurantCategory', 'products.productCategory'])
  }

  async updateAverageServiceTime (restaurantId) {
    const restaurant = await RestaurantMongoose.findById(restaurantId)
    if (!restaurant) return null

    restaurant.averageServiceMinutes = await restaurant.getAverageServiceTime()
    return restaurant.save()
  }
}

export default RestaurantRepository
