require("dotenv").config();
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

app.use(bodyParser.json());

const s3 = new AWS.S3({
  accessKeyId: "AKIAQM53GUAH5VJCSAMN",
  secretAccessKey: "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",
});

app.post("/register", async (req, res) => {
  try {
    const userData = req.body; // Assuming the request body contains the user data

    // Generate a salt and hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.password, salt);

    // Create a new user with the encrypted password
    const newUser = new User({
      mobileNumber: userData.mobileNumber,
      password: hashedPassword,
      email: userData.email,
      fullName: userData.fullName,
      address: userData.address,
      state: userData.state,
      city: userData.city,
    });

    // Save the user to the database
    const savedUser = await newUser.save();

    return res.status(201).json(savedUser);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to create user." });
  }
});

app.post("/login", (req, res, next) => {
  passport.authenticate("local", { session: false }, (err, user, info) => {
    if (err) {
      return res.status(500).json({ error: "An error occurred" });
    }
    if (!user) {
      return res
        .status(401)
        .json({ error: "Invalid mobile number or password" });
    }

    req.login(user, { session: false }, (err) => {
      if (err) {
        return res.status(500).json({ error: "An error occurred" });
      }

      // Generate and sign the JWT token
      const token = jwt.sign({ sub: user._id }, "Agcup8057"); // Replace with your own secret key

      // Fetch all the object URLs from your Amazon S3 bucket
      const bucketName = "gagan-shivam-jewellers-v1"; // Replace with your S3 bucket name

      const params = {
        Bucket: bucketName,
      };

      s3.listObjectsV2(params, (err, data) => {
        if (err) {
          console.error("Error retrieving object URLs:", err);
          return res.status(500).json({ error: "An error occurred" });
        }

        // Extract the object URLs from the S3 response
        const objectURLs = data.Contents.map((object) => {
          return `https://${bucketName}.s3.amazonaws.com/${object.Key}`;
        });

        // Return the token, user profile data, and object URLs in the response
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

//this one for forget Password
app.put("/update-password", async (req, res) => {
  try {
    const { mobileNumber, password } = req.body;

    // Find the user by mobile number
    const user = await User.findOne({ mobileNumber });

    // If user not found, return error
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update the user's password
    user.password = hashedPassword;
    await user.save();

    return res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "An error occurred" });
  }
});

//this one for Change Password Inside the application
app.put(
  "/api/change-password",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
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

      // Update the user's password
      user.password = hashedPassword;
      await user.save();

      return res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "An error occurred" });
    }
  }
);

//For the listen from the server
app.listen(port, function (error) {
  if (error) {
    console.log(error);
  }
  console.log(`Server is Running On :${port}`);
});
