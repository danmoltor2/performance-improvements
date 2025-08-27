import { Schema } from 'mongoose'

const ProductSchema = new Schema({
  name: {
    type: String,
    required: 'Kindly enter the name'
  },
  description: {
    type: String,
    required: 'Kindly enter the description'
  },
  price: {
    type: Number,
    required: 'Kindly enter the price'
  },
  image: {
    type: String
  },
  order: {
    type: Number,
    required: 'Kindly enter the order'
  },
  availability: {
    type: Boolean,
    required: 'Kindly enter the availability'
  },
  _productCategoryId: {
    type: Schema.Types.ObjectId,
    required: 'Kindly enter the product category',
    ref: 'ProductCategory'
  }
}, {
  virtuals: {
    productCategoryId: {
      get () { return this._productCategoryId.toString() },
      set (productCategoryId) { this._productCategoryId = productCategoryId }
    },
    restaurantId: {
      get () { return this.ownerDocument()._id.toString() }
    }
  },
  strict: false,
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function (doc, resultObject, options) {
      delete resultObject._id
      delete resultObject.__v
      delete resultObject._productCategoryId
      return resultObject
    }
  }
})
ProductSchema.virtual('productCategory', {
  ref: 'ProductCategory',
  localField: '_productCategoryId',
  foreignField: '_id'
})
export default ProductSchema
