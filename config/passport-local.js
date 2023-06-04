const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const bcrypt = require('bcrypt');
const User = require('../modal/user');

// Local strategy for mobile number/password login
passport.use(
  new LocalStrategy(
    {
      usernameField: 'mobileNumber',
      passwordField: 'password',
    },
    async (mobileNumber, password, done) => {
      try {
        // Find the user by mobile number
        const user = await User.findOne({ mobileNumber });

        // If user not found or password is incorrect, return error
        if (!user || !(await bcrypt.compare(password, user.password))) {
          return done(null, false, { message: 'Invalid mobile number or password' });
        }

        // If user found and password is correct, return the user
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);

// JWT strategy for token-based authentication
passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: 'Agcup8057', // Replace with your own secret key
    },
    async (payload, done) => {
      try {
        // Find the user by ID from the payload
        const user = await User.findById(payload.sub);

        // If user not found, return error
        if (!user) {
          return done(null, false, { message: 'User not found' });
        }

        // If user found, return the user
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);
