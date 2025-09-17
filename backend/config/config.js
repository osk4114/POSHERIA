// Configuración de ejemplo
module.exports = {
  port: process.env.PORT || 3000,
  // Usuario y contraseña ofuscados para seguridad en el repo
  mongoUri: process.env.MONGO_URI || 'mongodb+srv://<usuario>:<contraseña>@cluster0.toffksb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'
};
