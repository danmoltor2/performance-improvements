module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Products', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        allowNull: false,
        type: Sequelize.STRING
      },
      description: {
        type: Sequelize.TEXT
      },
      price: {
        allowNull: false,
        type: Sequelize.DOUBLE
      },
      image: {
        type: Sequelize.STRING
      },
      order: {
        type: Sequelize.INTEGER
      },
      availability: {
        type: Sequelize.BOOLEAN
      },
      restaurantId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: {
            tableName: 'Restaurants'
          },
          key: 'id'
        },
        onDelete: 'cascade'
      },
      productCategoryId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: {
            tableName: 'ProductCategories'
          },
          key: 'id'
        }
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: new Date()
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: new Date()
      }
    })

    // Add index for restaurantId
    await queryInterface.addIndex('Products', ['restaurantId'], { name: 'products_restaurant_id' })
  },

  down: async (queryInterface, Sequelize) => {
    // Get all indexes for the Products table
    const indexes = await queryInterface.sequelize.query(
      'SHOW INDEXES FROM Products',
      { type: Sequelize.QueryTypes.SHOWINDEXES }
    )

    // Drop the index only if it exists
    const indexExists = indexes.some(index => index.Key_name === 'products_restaurant_id')
    if (indexExists) {
      await queryInterface.removeIndex('Products', 'products_restaurant_id')
    }

    await queryInterface.dropTable('Products')
  }
}
