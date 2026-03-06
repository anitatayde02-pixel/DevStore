require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const nodemailer = require('nodemailer');

// --- EMAIL SETUP ---
// ईमेल भेजने का नया और सुरक्षित (Secure) सेटअप
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // यह Render सर्वर के लिए 'सुरक्षित रास्ता' खोलता है
    auth: {
        user: 'anitatayde02@gmail.com', // यहाँ अपना ईमेल रहने दें 
        pass: 'rrznudatemaqlhcd' 
    }
});

// --- CLOUDINARY CONFIG ---
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();
const PORT = process.env.PORT || 3000;

// --- MONGODB CONNECTION ---
const MONGO_URI = "mongodb+srv://anitatayde02_db_user:Anitanagrade-1@myecomdb.j2fonsj.mongodb.net/?retryWrites=true&w=majority&appName=myEcomDB";

mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected!"))
    .catch(err => console.log("❌ DB Error:", err));

// Cloudinary Setup (Hardcoded for now as per your code)
cloudinary.config({
    cloud_name: 'dykjqaiex',
    api_key: '512814992321585',
    api_secret: '8diYEe5ajLNYQzd5ZPFo2dltaYo'
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: { folder: 'my-shop-images', allowed_formats: ['jpg', 'png', 'jpeg', 'webp','avif'] }
});
const upload = multer({ storage: storage });

app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Frontend files

// --- SCHEMAS ---

// 1. User Schema
const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'user' },
    date: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

// 2. Product Schema (UPDATED FOR MEESHO RESELLING)
// --- UPDATED PRODUCT SCHEMA (New Fields Added) ---
const ProductSchema = new mongoose.Schema({
    name: String,
    price: Number,
    supplierPrice: Number,
    link: String,
    category: String,
    type: String,
    description: String,
    image: String,
    extraDetail: String,
    images: [String],
    fabric: { type: String, default: 'N/A' },
    color: { type: String, default: 'Multicolor' },
    size: { type: String, default: 'Free Size' },
    rating: { type: Number, default: 4.5 },
    date: { type: Date, default: Date.now }
});
const Product = mongoose.model('Product', ProductSchema);

// 3. Order Schema
const OrderSchema = new mongoose.Schema({
    orderId: String, date: String, status: String, trackingId: String, total: Number, cart: Array, customer: Object, paymentId: String
});
const Order = mongoose.model('Order', OrderSchema);

// 4. Message Schema (Contact Us)
const messageSchema = new mongoose.Schema({
    name: String, email: String, message: String, date: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', messageSchema);


// --- AUTH ROUTES ---

app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.json({ success: false, message: "Email already exists!" });

        const newUser = new User({ name, email, password });
        await newUser.save();
        res.json({ success: true, message: "Registration Successful! Please Login." });
    } catch (err) {
        res.json({ success: false, message: "Error registering user" });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (email === "admin@omni.com" && password === "admin") {
            return res.json({ success: true, user: { name: "Super Admin", role: "admin", email } });
        }
        const user = await User.findOne({ email, password });
        if (user) {
            res.json({ success: true, user: { name: user.name, role: user.role, email: user.email } });
        } else {
            res.json({ success: false, message: "Invalid Email or Password" });
        }
    } catch (err) {
        res.json({ success: false, message: "Server Error" });
    }
});

// --- PRODUCT ROUTES (UPDATED WITH NEW FIELDS) ---

// 1. Get Products
app.get('/api/products', async (req, res) => {
    try {
        let query = {};
        if (req.query.type && req.query.type !== 'all') query.type = req.query.type;
        if (req.query.category && req.query.category !== 'all') query.category = req.query.category;
        if (req.query.search) query.name = { $regex: req.query.search, $options: 'i' };
        
        const products = await Product.find(query).sort({ date: -1 });
        res.json(products);
    } catch (err) { res.status(500).json([]); }
});

// 2. Add Product (Ab ye Fabric, Color, Size bhi save karega)
// यह कोड पुराने वाले की जगह पेस्ट करें
app.post('/api/products', upload.array('images', 6), async (req, res) => {
    try {
        console.log("👉 Files Recieved:", req.files); // चेक करने के लिए

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, message: "No images uploaded!" });
        }

        // सारी फोटोज के लिंक निकालें
        const imagePaths = req.files.map(f => f.path);

        const newProduct = new Product({
            name: req.body.name,
            price: req.body.price,
            supplierPrice: req.body.supplierPrice || req.body['supplier-price'],
            link: req.body.link,
            category: req.body.category,
            type: req.body.type,

            // 👇 सबसे जरूरी हिस्सा
            image: imagePaths[0],  // पहली फोटो को Main Photo बनाओ
            images: imagePaths,    // सारी फोटोज को Gallery में डालो

            description: req.body.description || "Premium Quality",
            fabric: req.body.fabric || "N/A",
            color: req.body.color || "Multicolor",
            size: req.body.size || "Free Size",
            extraDetail: req.body.extraDetail
        });

        await newProduct.save();
        console.log("✅ Product Saved with Gallery!");
        res.json({ success: true, message: "Saved!" });

    } catch (err) {
        console.error("❌ Error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});
// 👇 4. Edit/Update Product 👇
app.put('/api/products/:id', upload.array('images', 6), async (req, res) => {
    try {
        let updateData = {
            name: req.body.name,
            price: req.body.price,
            supplierPrice: req.body.supplierPrice || req.body['supplier-price'],
            link: req.body.link,
            category: req.body.category,
            type: req.body.type,
            fabric: req.body.fabric || "N/A",
            color: req.body.color || "Multicolor",
            size: req.body.size || "Free Size",
            extraDetail: req.body.extraDetail
        };

        // अगर एडिट करते समय नई फोटो भी डाली है, तो फोटो अपडेट करो
        if (req.files && req.files.length > 0) {
            const imagePaths = req.files.map(f => f.path);
            updateData.image = imagePaths[0]; // Main Photo
            updateData.images = imagePaths;   // Gallery
        }

        await Product.findByIdAndUpdate(req.params.id, updateData);
        res.json({ success: true, message: "Product Updated!" });
    } catch (err) {
        console.error("❌ Edit Error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});
// 3. Delete Product
app.delete('/api/products/:id', async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: "Error deleting" });
    }
});


// --- ORDER ROUTES ---
app.post('/api/orders', async (req, res) => {
    try {
        const data = req.body;
        
        // 1. Create Order
        const newOrder = new Order({
            orderId: 'ORD-' + Date.now(), 
            date: new Date().toLocaleDateString(), 
            status: "Pending",
            total: data.total, 
            cart: data.items || data.cart, 
            customer: data.customer || {},
            paymentId: data.paymentId || 'COD'
        });
        
        await newOrder.save();

        // 2. Send Email
        const mailOptions = {
            from: 'OmniShop <anitatayde02@gmail.com>',
            to: data.customer.email, 
            subject: `Order Confirmed! Order #${newOrder.orderId}`,
            html: `
                <h2>Thank you for your order, ${data.customer.name}!</h2>
                <p>We have received your payment (Ref: ${data.paymentId})</p>
                <p><strong>Order ID:</strong> ${newOrder.orderId}</p>
                <p><strong>Total Amount:</strong> ₹${data.total}</p>
                <br>
                <p>We will ship your items shortly.</p>
                <p>Regards,<br>OmniShop Team</p>
            `
        };

        transporter.sendMail(mailOptions, (err, info) => {
            if(err) console.log("Email Error:", err);
            else console.log("Email Sent Successfully!");
        });

        res.json({ success: true, orderId: newOrder.orderId });

    } catch (err) {
        console.error("Order Error:", err);
        res.status(500).json({ success: false, message: "Error placing order" });
    }
});

app.get('/api/admin/orders', async (req, res) => {
    try { const orders = await Order.find().sort({ _id: -1 }); res.json(orders); } catch (err) { res.json([]); }
});

app.post('/api/update-order', async (req, res) => {
    const { orderId, status, trackingId } = req.body;
    await Order.updateOne({ orderId }, { status, trackingId });
    res.json({ success: true });
});

app.get('/api/my-orders/:email', async (req, res) => {
    try {
        const email = req.params.email;
        const orders = await Order.find({ "customer.email": email }).sort({ _id: -1 });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: "Error fetching orders" });
    }
});

// --- MESSAGE ROUTES ---
app.post('/api/contact', async (req, res) => {
    try {
        const newMessage = new Message(req.body);
        await newMessage.save();
        res.json({ success: true, message: "Message sent successfully!" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Error sending message" });
    }
});

app.get('/api/messages', async (req, res) => {
    try { const messages = await Message.find().sort({ date: -1 }); res.json(messages); } catch (err) { res.status(500).json({ error: "Error fetching messages" }); }
});


// --- FRONTEND ROUTING ---
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- START SERVER ---
app.listen(PORT, () => console.log(`OmniShop Server running at http://localhost:${PORT}`));