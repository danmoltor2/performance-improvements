import Sequelize from 'sequelize'
import RepositoryBase from '../RepositoryBase.js'
import { OrderSequelize, RestaurantSequelize, ProductSequelize, RestaurantCategorySequelize, ProductCategorySequelize } from './models/models.js'

class ProductRepository extends RepositoryBase {
  async findById (id, ...args) {
    return ProductSequelize.findByPk(id, {
      include: [
        {
          model: ProductCategorySequelize,
          as: 'productCategory'
        }]
    }
    )
  }

  async indexRestaurant (restaurantId) {
    return ProductSequelize.findAll({
      where: {
        restaurantId
      }
    })
  }

  async show (id) {
    return this.findById(id)
  }

  async create (productData, ...args) {
    return (new ProductSequelize(productData)).save()
  }

  async update (id, dataToUpdate, ...args) {
    const entity = await ProductSequelize.findByPk(id)
    entity.set(dataToUpdate)
    return entity.save()
  }

  async destroy (id, ...args) {
    const result = await ProductSequelize.destroy({ where: { id } })
    return result === 1
  }

  async save (businessEntity, ...args) {
    return this.create(businessEntity)
  }

  async popular () {
    try {
      // Get the 3 most sold products
      const topProductIdsQuery = `
            SELECT 
                productId, 
                SUM(quantity) AS soldProductCount
            FROM 
                deliverusadvanced.OrderProducts
            GROUP BY 
                productId
            ORDER BY 
                soldProductCount DESC
            LIMIT 3
        `

      const topProductIds = await ProductSequelize.sequelize.query(topProductIdsQuery, {
        type: Sequelize.QueryTypes.SELECT,
        raw: true,
        timeout: 5000 // Prevent long-running queries
      })

      // If no products have been sold, return an empty array
      if (topProductIds.length === 0) {
        return []
      }

      // Extract product IDs
      const productIds = topProductIds.map(p => p.productId)

      // Create a lookup map for soldProductCount
      const countMap = Object.fromEntries(topProductIds.map(p => [p.productId, p.soldProductCount]))

      // Fetch product details using indexed queries
      const products = await ProductSequelize.findAll({
        where: { id: productIds },
        include: [{
          model: RestaurantSequelize,
          as: 'restaurant',
          attributes: ['id', 'name'],
          include: [{
            model: RestaurantCategorySequelize,
            as: 'restaurantCategory',
            attributes: ['id', 'name']
          }]
        }],
        attributes: ['id', 'name', 'price'],
        raw: true,
        nest: true
      })

      // Maintain the original order from topProductIds
      const orderedProducts = productIds.map(productId => {
        const product = products.find(p => p.id === productId)
        return product ? { ...product, soldProductCount: countMap[productId] } : null
      }).filter(Boolean)

      return orderedProducts
    } catch (error) {
      console.error('Error fetching popular products:', error)
      return []
    }
  }

  async checkProductOwnership (productId, ownerId) {
    const product = await ProductSequelize.findByPk(productId, { include: { model: RestaurantSequelize, as: 'restaurant' } })
    return ownerId === product.restaurant.userId
  }

  async checkProductRestaurantOwnership (restaurantId, ownerId) {
    const restaurant = await RestaurantSequelize.findByPk(restaurantId)
    return ownerId === restaurant.userId
  }

  async checkProductHasNotBeenOrdered (productId) {
    const product = await ProductSequelize.findByPk(productId, { include: { model: OrderSequelize, as: 'orders' } })
    return product.orders.length === 0
  }
}

export default ProductRepository
