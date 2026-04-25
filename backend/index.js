require('dotenv').config()
const express = require('express')
const cors = require('cors')
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
const admin = require('firebase-admin')
const port = process.env.PORT || 3000
const decoded = Buffer.from(process.env.FB_SERVICE_KEY, 'base64').toString(
  'utf-8'
)
const serviceAccount = JSON.parse(decoded)
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
})

const app = express()
// middleware
app.use(
  cors({
    origin: [
      process.env.CLIENT_DOMAIN_URL
    ],
    credentials: true,
    optionSuccessStatus: 200,
  })
)
app.use(express.json())

// jwt middlewares
const verifyJWT = async (req, res, next) => {
  const token = req?.headers?.authorization?.split(' ')[1]
  console.log(token)
  if (!token) return res.status(401).send({ message: 'Unauthorized Access!' })
  try {
    const decoded = await admin.auth().verifyIdToken(token)
    req.tokenEmail = decoded.email
    console.log(decoded)
    next()
  } catch (err) {
    console.log(err)
    return res.status(401).send({ message: 'Unauthorized Access!', err })
  }
}

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(process.env.MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
})
async function run() {
  try {
    const db = client.db('plantsDB')
    const plantsCollection = db.collection('plants')
    const ordersCollection = db.collection('orders')
    const usersCollection = db.collection('users')

    // Save a plant data in db
    app.post('/plants', async (req, res) => {
      const plantData = req.body
      console.log(plantData)
      const result = await plantsCollection.insertOne(plantData)
      res.send(result)
    })

    // get all plants from db
    app.get('/plants', async (req, res) => {
      const result = await plantsCollection.find().toArray()
      res.send(result)
    })

    app.get('/plant/:id', async(req,res) => {
      const id = req.params.id;
      const result = await plantsCollection.findOne({_id: new ObjectId(id)});
      res.send(result)
    })

    // payment all apis
    app.post('/create-checkout-session', async(req,res) => {
      const paymentInfo = req.body
      console.log("from create-checkout-session : ", paymentInfo)

      const session = await stripe.checkout.sessions.create({
          line_items: [
          {
            // Provide the exact Price ID (for example, price_1234) of the product you want to sell
            price_data: {
              currency: 'usd',
              product_data: {
                name: paymentInfo?.name,
                description: paymentInfo?.description,
                images: [paymentInfo?.image]
              },
              unit_amount: paymentInfo?.price * 100,
            },
            quantity: paymentInfo?.quantity,
          },
        ],
        mode: 'payment',
        customer_email: paymentInfo?.customer?.email,
        metadata: {
          plantId: paymentInfo?.plantId,
          customer: paymentInfo?.customer?.email
        },
        success_url: `${process.env.CLIENT_DOMAIN_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.CLIENT_DOMAIN_URL}/plant/${paymentInfo?.plantId}`
    });

    res.send({url: session.url})
      
    })


    app.post('/payment-success', async(req,res) => {
      const {session_id} = req.body;
      const session = await stripe.checkout.sessions.retrieve(session_id);
      console.log("from payment-success : ",session);
      const plant = await plantsCollection.findOne({_id: new ObjectId(session?.metadata?.plantId)});

      if(session?.status === 'complete' && plant){
        // save the payment info in db
        const orderInfo = {
          plantId: session?.metadata?.plantId,
          customer_email: session?.customer_email,
          price: session?.amount_total / 100,
          plant_name: plant?.name,
          plant_image: plant?.image,
          customer: session?.customer,
          transactionId: session?.payment_intent,
          category: plant?.category,
          quantity: 1,
          status: 'pending',
          seller_email: plant?.seller?.email
        }
        // console.log(orderInfo);

        const order = await ordersCollection.findOne({transactionId: session?.payment_intent});

        if(!order){
          const result = await ordersCollection.insertOne(orderInfo);
          // update the quantity of the plant in db
          const updatedQuantity = plant?.quantity - 1;
          await plantsCollection.updateOne({_id: new ObjectId(session?.metadata?.plantId)}, {$set: {quantity: updatedQuantity}});
          return res.send({
            transactionId: session?.payment_intent,
            orderId: result?.insertedId
          })
        }

        return res.send({
          transactionId: session?.payment_intent,
          orderId: order?._id
        })

      }
      
      return res.status(400).send({message: 'Payment not successful or plant not found'})
    })
    
    // my orders api
    app.get('/my-orders/:email', async(req,res) => {
      const email = req.params.email;
      console.log('from my-orders : ', email);
      const orders = await ordersCollection.find({customer_email: email}).toArray();
      res.send(orders);
    })

    app.delete('/delete-order/:id', async(req,res) => {
      const id = req.params.id;
      const order = await ordersCollection.findOne({_id: new ObjectId(id)});
      if(order){
        const result = await ordersCollection.deleteOne({_id: new ObjectId(id)});
        // update the quantity of the plant in db
        const plant = await plantsCollection.findOne({_id: new ObjectId(order?.plantId)});
        const updatedQuantity = plant?.quantity + 1;
        await plantsCollection.updateOne({_id: new ObjectId(order?.plantId)}, {$set: {quantity: updatedQuantity}});
        return res.send(result);
      }
      return res.status(404).send({message: 'Order not found'})
    })

    app.get('/manage-orders/:seller_email', async(req,res) => {
      const seller_email = req.params.seller_email;
      const orders = await ordersCollection.find({seller_email}).toArray();
      res.send(orders);
    })

    app.get('/my-inventory/:email', async(req, res) => {
      const email = req.params.email;
      const plants = await plantsCollection.find({ 'seller.email': email }).toArray();
      res.send(plants);
    })


    // save or update a user in db
    app.post('/user', async(req,res) => {
      const userData = req.body;
      userData.created_at = new Date()
      userData.updated_at = new Date()
      console.log('from save or update user api : ', userData);
      const query = {email : userData?.email};
      const userExist = await usersCollection.findOne(query);

      if(userExist){
        console.log('user already exist, updating the data');
        const updateUser = await usersCollection.updateOne(query, {$set: {updated_at: new Date()}});
        return res.send(updateUser);
      }

      const result = await usersCollection.insertOne(userData);
      res.send(result);
    })

    // Send a ping to confirm a successful connection
    await client.db('admin').command({ ping: 1 })
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    )
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir)

app.get('/', (req, res) => {
  res.send('Hello from Server..')
})

app.listen(port, () => {
  console.log(`Server is running on port ${port}`)
})
