require('dotenv').config();
const express = require('express');
const passport = require('passport');
const OIDCStrategy = require('passport-azure-ad').OIDCStrategy;
const session = require('express-session');

const app = express();
const port = 3000;

// Configuración de la estrategia de autenticación
passport.use(new OIDCStrategy({
  identityMetadata: `https://login.microsoftonline.com/${process.env.TENANT_ID}/v2.0/.well-known/openid-configuration`,
  clientID: process.env.CLIENT_ID,
  responseType: 'id_token',  // Cambiado para evitar error
  responseMode: 'form_post',
  redirectUrl: 'http://localhost:3000/auth/callback',
  allowHttpForRedirectUrl: true,
  clientSecret: process.env.CLIENT_SECRET,
  validateIssuer: false,
  passReqToCallback: false,
  scope: ['openid', 'profile', 'email']  // Scopes corregidos
}, (iss, sub, profile, accessToken, refreshToken, done) => {
  return done(null, profile);
}));

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((obj, done) => {
  done(null, obj);
});

// Configuración de la sesión
app.use(session({
  secret: process.env.SECRET_KEY,
  resave: false,
  saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

app.get('/', (req, res) => {
  res.send('¡Hola, mundo desde Docker!');
});

app.get('/login', passport.authenticate('azuread-openidconnect', { failureRedirect: '/' }), (req, res) => {
  res.redirect('/');
});

app.post('/auth/callback', passport.authenticate('azuread-openidconnect', { failureRedirect: '/' }), (req, res) => {
  res.redirect('/');
});

app.listen(port, () => {
  console.log(`La aplicación está escuchando en http://localhost:${port}`);
});
