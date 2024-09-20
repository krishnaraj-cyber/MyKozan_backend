import moment from "moment-timezone";
import { Order, Ordermaster } from "../../models/OrderModel.js";
import { Product  } from "../../models/ProductModel.js";


// Get all orders
export const getAllOrders = async (req, res ) => {
    try {
      const { Role, Email } = req.user;
      const query = Role === 'Customer' ? { Email: Email }:{};
      const orders = await Order.find(query) ;
      res.send( orders );
  } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Error fetching orders", error });
    }
  };



// Create a new order
// export const createOrder = async (req, res) => {
//   try {
//     const {order, ordermaster} = req.body;
//     // Generate a unique Order_id if not provided
//     const uniqueOrderId = `MYKO_${moment().format('DDMMYY_HHmmss')}`;
//     // Create the main order
//     const savedOrder = await new Order(order).save();
//     // Save each product to the OrderMaster collection
//     const productOrders = products.map((product) => ({...product, Order_id: uniqueOrderId }));
//     await Ordermaster.insertMany(productOrders);
//     // await Ordermaster.insertMany(ordermaster);
//     res.status(201).json({ order: savedOrder, products: productOrders });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Error creating order", error });
//   }
// };
export const createOrder = async (req, res) => {
    try {
      const { order, ordermaster} = req.body; // Extract products and order details
    
const getFinancialYear = (date) => {
    const year = moment(date).year();
    const month = moment(date).month(); 
    return month >= 3  ? `${year % 100}${(year + 1) % 100}` : `${(year - 1) % 100}${year % 100}`;
  };
  const count = await Order.countDocuments();
  
      const uniqueOrderId = `MYKO_${moment().format('DDMMYY_HHmmss')}`;
      const uniqueOrderId2 = `MYKOINV_${getFinancialYear(moment())}_${ count + 1}`;
      const orderWithId = { ...order, Order_id: uniqueOrderId ,Invoice_ID: uniqueOrderId2 };
      const savedOrder = await new Order(orderWithId).save();
      const productOrders = ordermaster.map((product) => ({
        ...product,
        Order_id: uniqueOrderId, // Use the same Order_id for ordermaster
      }));
      await Ordermaster.insertMany(productOrders);
         // Reduce stock for each product ordered
    for (const product of ordermaster) {
        await Product.findOneAndUpdate(
          { Product_Name: product.Product_Name },
          { $inc: { Avail_Stock: -product.Quantity } } // Decrease stock based on quantity ordered
        );
      }
      res.send({ order: savedOrder, products: productOrders });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error creating order", error });
    }
  };

// Get order by Order ID
export const getOrderById = async (req, res) => {
  try {
    const { Order_id } = req.query;
    const orderItems = await Ordermaster.find({ Order_id });
    res.status(200).json({ orderItems });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching order", error });
  }
};

// Update order status
export const updateOrderStatus = async (req, res) => {
  try {
    const { _id } = req.query;
    const { Order_Status,  } = req.body;

    const currentOrder = await Order.findById(_id);
    if (!currentOrder) {
      return res.send({ message: "Order not found" });
    }
    const statusHasChanged = currentOrder.Order_Status !== Order_Status;
    const updateFields = { Order_Status };
    if (statusHasChanged) {
      updateFields.Updated_At = moment().format(); 
    }
    const updatedOrder = await Order.findByIdAndUpdate(_id, updateFields, { new: true });
    res.send({ message: "Order updated successfully", updatedOrder });
 } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error updating order", error });
  }
};

    // const updatedOrder = await Order.findOneAndUpdate({ _id },{ Order_Status,  Updated_At: Order_Status ? new Date() : res.body });
    // if (!updatedOrder) {
    //   return res.status(20).json({ message: "Order not found" });
    // }
    // res
    //   .status(200)
    //   .json({ message: "Order updated successfully", updatedOrder });
 



// Delete order


export const deleteOrder = async (req, res) => {
  try {
    const { Order_id } = req.query;
    const orderItems = await Ordermaster.find({ Order_id });
    const deletedOrder = await Order.findOneAndDelete({ Order_id });
                         await Ordermaster.deleteMany({ Order_id });
    

    if (!deletedOrder) {
      return res.send({ message: "Order not found" });
    }
     
    for (const item of orderItems) {
      await Product.findOneAndUpdate(
        { Product_Name: item.Product_Name },
        { $inc: { Avail_Stock: +item.Quantity } } // Increase stock back based on quantity in the order
      );
    }

    res
      .send({
        message: "Order deleted successfully",
        deletedOrder,
              });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error deleting order", error });
  }
};
