// app.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const path = require('path');
const apiRoutes = require('./apiRoutes'); // Arquivo de rotas da API separado

const app = express();

mongoose.connect('mongodb://127.0.0.1:27017/lugazza', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('Conectado ao MongoDB'))
.catch(err => {
    console.error('Erro ao conectar ao MongoDB:', err.message);
    process.exit(1);
});

app.use(session({
    secret: 'secretKey',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

function isAuthenticated(req, res, next) {
    if (req.session.userId) {
        return next();
    }
    return res.status(401).json({ message: 'Acesso negado. Por favor, faça login.' });
}

async function createAdminUser() {
    try {
        const Client = require('./database').Client;
        const adminUser = await Client.findOne({ username: 'admin' });
        if (!adminUser) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await Client.create({ username: 'admin', password: hashedPassword, role: 'admin' });
            console.log('Usuário admin criado com sucesso!');
        }
    } catch (err) {
        console.error('Erro ao criar usuário admin:', err.message);
    }
}

app.use('/api', apiRoutes);

app.get('/dashboard_admin', isAuthenticated, (req, res) => {
    if (req.session.username === 'admin') {
        res.sendFile(path.join(__dirname, 'public', 'dashboard_admin.html'));
    } else {
        res.redirect('/dashboard_client');
    }
});

app.get('/dashboard_client', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard_client.html'));
});

const PORT = 3000;
app.listen(PORT, (err) => {
    if (err) {
        console.error("Erro ao iniciar o servidor:", err);
        process.exit(1);
    }
    createAdminUser();
    console.log(`Servidor rodando na porta ${PORT}`);
});
