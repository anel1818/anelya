require('dotenv').config();
const express = require("express");
const passport = require('passport');
const cors = require("cors");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const path = require("path");
const session = require('express-session');
const axios = require('axios');
const nodemailer = require('nodemailer');
const { connectDB, getDB } = require('./mongo');
const { User } = require("./mongo");
const { requireRole } = require('./middleware/authorization');

const { addImage, updateImage, deleteImage, fetchImages } = require('./imageModel');

const app = express();

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));

app.use(session({ 
  secret: 'c65d4a1f47da245a77e265441f35e0ee33945daa04dd2677724d91fb93fcab3f18cc34db28f9f3b2644c105976cde590d77bf5d3c889613c178b53a2dd8ac4f7', 
  resave: false, 
  saveUninitialized: true }));

app.use(passport.initialize());
app.use(passport.session());
app.use(express.json()); 


app.get("/", (req, res) => {
  res.render("welcome");
});
// Register Page
app.get("/register", (req, res) => {
  res.render("register");
});

// Login Page
app.get("/login", (req, res) => {
  res.render("login");
});

// Main Page

app.get('/food-images', async (req, res) => {
  try {
      const response = await axios.get('https://api.pexels.com/v1/search?query=food', {
          headers: {
              Authorization: 'n96lYtwysjuSLnaZXlwip8ZjEifPiTsNqRVbug2ZyR7a56dMdyTwrXmg'
          }
      });
      const images = response.data.photos.map(photo => ({
          src: photo.src.original,
          photographer: photo.photographer
      }));
      res.render('food-images', { images });
  } catch (error) {
      console.error('Failed to fetch images:', error);
      res.render('error', { message: 'Failed to fetch food images. Please try again.' });
  }
});




app.get('/nutrition', async (req, res) => {
  const query = req.query.foodSearch; 

  if (!query) {
    res.render('nutrition', { food: null, error: null });
  } else {
    try {
      const response = await axios.get(`https://api.nal.usda.gov/fdc/v1/foods/search`, {
        params: {
          api_key: 'cBMpdHfqhb5kLzV9y9Y3GBp2IKrXHiRcqF0UzVz1',
          query: query
        }
      });

      const foodData = response.data.foods && response.data.foods.length > 0 ? response.data.foods[0] : null;

      res.render('nutrition', { food: foodData, error: null });
    } catch (error) {
      console.error('Error fetching food data:', error);
      res.render('nutrition', { food: null, error: 'Error fetching food data' });
    }
  }

});

app.get('/meal', (req, res) => {
  res.render('meal', { recipes: null, error: null }); 
});

app.post('/search', async (req, res) => {
  const ingredient = req.body.ingredient;
  const url = `https://api.edamam.com/search?q=${ingredient}&app_id=${process.env.EDAMAM_APP_ID}&app_key=${process.env.EDAMAM_API_KEY}`;

  try {
    const response = await axios.get(url);
    const recipes = response.data.hits;
    res.render('meal', { recipes: recipes });
  } catch (error) {
    console.error(error);
    res.render('meal', { recipes: null, error: 'Error fetching recipes' });
  }
});


// registration
app.post("/register", async (req, res) => {
  try {
      const { username, password, email, firstName, lastName, age, country, gender } = req.body;
      
      const existingUser = await User.findOne({ username });
      if (existingUser) {
          return res.status(400).send("User already exists");
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const newUser = new User({ username, password: hashedPassword, email, firstName, lastName, age, country, gender });
      await newUser.save();
      res.redirect("/login");
  } catch (error) {
      console.error("Error registering new user:", error);
      res.status(500).send("Error registering new user, please try again.");
  }
});



// Nodemailer 
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
      user: 'nauruzovaanel@gmail.com',
      pass: 'jakh dpcg tudo oapr'
  },
});

// Login endpoint
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
      const user = await User.findOne({ email });
      if (user && await bcrypt.compare(password, user.password)) {
          req.session.user = { id: user._id, role: user.role };
  
          const mailOptions = {
              from: 'nauruzovaanel@gmail.com',
              to: email, 
              subject: "Welcome Back!",
              text: "Hello, welcome back to Apelsin. We're glad to see you again!", 
          };

          transporter.sendMail(mailOptions, (error, info) => {
              if (error) {
                  console.log(error);
                  res.status(500).send('Error sending email');
              } else {
                  console.log('Email sent: ' + info.response);
                   res.redirect('/main');
              }
          });
      } else {
          res.status(400).send('Invalid credentials');
      }
  } catch (error) {
      console.error(error);
      res.status(500).send('Server error');
  }
});

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Error destroying session:", err);
            return res.status(500).send("Error logging out, please try again.");
        }
        res.redirect('/login');
    });
});


app.get('/main', async (req, res) => {
  try {
      const images = await fetchImages();
      res.render('main', { images, isAdmin: req.session.user?.role === 'admin' });
  } catch (error) {
      console.error('Failed to fetch images:', error);
      res.sendStatus(500);
  }
});

app.post('/add-image', requireRole('admin'), async (req, res) => {
  try {
      await addImage(req.body);
      res.redirect('/main');
  } catch (error) {
      console.error('Failed to add image:', error);
      res.sendStatus(500);
  }
});

app.post('/edit-image',requireRole('admin'), async (req, res) => {
  // Extract information from the request body
  const { id, name, url, description } = req.body;

  try {
      // Assuming you have a function updateImage that updates the image based on its ID
      await updateImage(id, { name, url, description });

      // Redirect to the homepage or to the updated image's page after successful update
      res.redirect('/main');
  } catch (error) {
      console.error('Failed to update image:', error);
      // Handle errors, maybe display a message to the user
      res.status(500).send('Error updating image');
  }
});



app.get('/delete-image/:id',requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  try {
      await deleteImage(id); // Assuming deleteImage is a function in your model that handles deletion
      res.redirect('/main'); // Redirect back to the homepage (or wherever your carousel is) after deletion
  } catch (error) {
      console.error('Failed to delete image:', error);
      res.status(500).send('Error deleting image');
  }
});

const PORT = process.env.PORT || 3000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}).catch(error => {
  console.error('Failed to connect to MongoDB:', error);
});

