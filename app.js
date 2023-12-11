// Load environment variables from a .env file
require("dotenv").config();

// Import required modules and libraries
const express = require("express");
const port = 8000;
const app = express();
const bodyParser = require("body-parser");
const db = require("./config/mongoose");
const User = require("./modal/user");
const AWS = require("aws-sdk");
const S3 = new AWS.S3();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const passportLocal = require("./config/passport-local");

// Use body-parser middleware to parse JSON requests
app.use(bodyParser.json());

// Set up AWS S3 with access credentials
const s3 = new AWS.S3({
  accessKeyId: "",
  secretAccessKey: "",
});

// Handle POST request for user registration
app.post("/register", async (req, res) => {
  try {
    // Extract user data from the request body
    const userData = req.body;

    // Generate a salt and hash the password using bcrypt
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.password, salt);

    // Create a new user instance with hashed password
    const newUser = new User({
      mobileNumber: userData.mobileNumber,
      password: hashedPassword,
      email: userData.email,
      fullName: userData.fullName,
      address: userData.address,
      state: userData.state,
      city: userData.city,
    });

    // Save the new user to the database
    const savedUser = await newUser.save();

    // Respond with the saved user data
    return res.status(201).json(savedUser);
  } catch (error) {
    console.error(error);
    // Handle registration failure
    return res.status(500).json({ error: "Failed to create user." });
  }
});

// Handle POST request for user login
app.post("/login", (req, res, next) => {
  passport.authenticate("local", { session: false }, (err, user, info) => {
    if (err) {
      return res.status(500).json({ error: "An error occurred" });
    }
    if (!user) {
      return res.status(401).json({ error: "Invalid mobile number or password" });
    }

    // Log in the user and generate a JWT token
    req.login(user, { session: false }, (err) => {
      if (err) {
        return res.status(500).json({ error: "An error occurred" });
      }

      // Generate and sign the JWT token
      const token = jwt.sign({ sub: user._id }, "Agcup8057"); // Replace with your own secret key

      // Fetch object URLs from Amazon S3
      const bucketName = "gagan-shivam-jewellers-v1";

      const params = {
        Bucket: bucketName,
      };

      s3.listObjectsV2(params, (err, data) => {
        if (err) {
          console.error("Error retrieving object URLs:", err);
          return res.status(500).json({ error: "An error occurred" });
        }

        // Extract object URLs from S3 response
        const objectURLs = data.Contents.map((object) => {
          return `https://${bucketName}.s3.amazonaws.com/${object.Key}`;
        });

        // Respond with token, user profile data, and object URLs
        const userProfileData = {
          fullName: user.fullName,
          email: user.email,
          mobileNumber: user.mobileNumber,
          address: user.address,
          state: user.state,
          city: user.city,
        };

        return res.json({ token, userProfileData, objectURLs });
      });
    });
  })(req, res, next);
});

// Handle PUT request to update password using mobile number
app.put("/update-password", async (req, res) => {
  try {
    // Extract mobile number and new password from the request body
    const { mobileNumber, password } = req.body;

    // Find the user by mobile number
    const user = await User.findOne({ mobileNumber });

    // Return error if user not found
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user's password and save
    user.password = hashedPassword;
    await user.save();

    // Respond with success message
    return res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error(error);
    // Handle update password failure
    return res.status(500).json({ error: "An error occurred" });
  }
});

// Handle PUT request to change password inside the application using JWT authentication
app.put(
  "/api/change-password",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      // Extract old and new passwords and user ID from the request body and JWT
      const { oldPassword, newPassword } = req.body;
      const userId = req.user._id;

      // Find the user by ID
      const user = await User.findById(userId);

      // Check if the provided old password matches the user's current password
      const isMatch = await bcrypt.compare(oldPassword, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: "Invalid old password" });
      }

      // Generate a salt and hash the new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      // Update user's password and save
      user.password = hashedPassword;
      await user.save();

      // Respond with success message
      return res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error(error);
      // Handle change password failure
      return res.status(500).json({ error: "An error occurred" });
    }
  }
);

// Start the server and listen on the specified port
app.listen(port, function (error) {
  if (error) {
    console.log(error);
  }
  console.log(`Server is Running On :${port}`);
});
