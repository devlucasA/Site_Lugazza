// apiRoutes.js
const express = require('express');
const bcrypt = require('bcrypt');
const multer = require('multer');
const multerS3 = require('multer-s3');
const aws = require('aws-sdk');
const router = express.Router();
const { Client, Project } = require('./database'); // Modelos exportados do database.js

// Configuração do AWS S3 para upload de imagens
aws.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
});

const s3 = new aws.S3();
const bucketName = process.env.AWS_S3_BUCKET_NAME;

if (!bucketName) {
    throw new Error('O nome do bucket S3 (AWS_S3_BUCKET_NAME) é obrigatório. Verifique o arquivo .env');
}

const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: bucketName,
        acl: 'public-read',
        key: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
    })
});

// Rota de Login com Verificações Detalhadas
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Verifica se o usuário existe no banco de dados
        const client = await Client.findOne({ username });
        if (!client) {
            console.log('Usuário não encontrado');
            return res.status(401).json({ message: 'Usuário ou senha incorretos' });
        }

        // Compara a senha fornecida com a senha armazenada no banco usando bcrypt
        const passwordMatch = await bcrypt.compare(password, client.password);
        if (!passwordMatch) {
            console.log('Senha incorreta');
            return res.status(401).json({ message: 'Usuário ou senha incorretos' });
        }

        // Configura a sessão com as informações do usuário
        req.session.userId = client._id;
        req.session.username = client.username;

        // Verifica o tipo de usuário e redireciona adequadamente
        if (client.username === 'admin') {
            res.json({ redirectURL: '/dashboard_admin' });
        } else {
            res.json({ redirectURL: '/dashboard_client' });
        }
    } catch (error) {
        console.error('Erro ao fazer login:', error);
        return res.status(500).json({ message: 'Erro no servidor' });
    }
});

// Outras rotas para clientes e projetos

// CRUD para Clientes
router.post('/add-client', async (req, res) => {
    const { username, project, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newClient = new Client({ username, project, password: hashedPassword });
        await newClient.save();
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao adicionar cliente:', error);
        res.status(500).json({ error: 'Erro ao adicionar cliente' });
    }
});

router.get('/clients', async (req, res) => {
    try {
        const clients = await Client.find().populate('project');
        res.json(clients);
    } catch (error) {
        console.error('Erro ao buscar clientes:', error);
        res.status(500).json({ message: 'Erro ao buscar clientes' });
    }
});

router.delete('/delete-client/:id', async (req, res) => {
    try {
        await Client.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao excluir cliente:', error);
        res.status(500).json({ error: 'Erro ao excluir cliente' });
    }
});

// CRUD para Projetos
router.post('/add-project', async (req, res) => {
    const { name, currentStage, progress, client } = req.body;
    try {
        const clientRecord = await Client.findOne({ username: client });
        if (!clientRecord) return res.status(404).json({ message: 'Cliente não encontrado' });

        const newProject = new Project({ name, currentStage, progress, client: clientRecord._id });
        await newProject.save();
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao adicionar projeto:', error);
        res.status(500).json({ error: 'Erro ao adicionar projeto' });
    }
});

router.put('/update-project/:id', async (req, res) => {
    const { name, currentStage, progress } = req.body;
    try {
        await Project.findByIdAndUpdate(req.params.id, { name, currentStage, progress });
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao atualizar projeto:', error);
        res.status(500).json({ error: 'Erro ao atualizar projeto' });
    }
});

router.delete('/delete-project/:id', async (req, res) => {
    try {
        await Project.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao excluir projeto:', error);
        res.status(500).json({ error: 'Erro ao excluir projeto' });
    }
});

// Upload de Imagens para AWS S3
router.post('/upload-images', upload.array('images', 12), async (req, res) => {
    try {
        const imageUrls = req.files.map(file => file.location);
        res.json({ success: true, urls: imageUrls });
    } catch (error) {
        console.error('Erro ao fazer upload de imagens:', error);
        res.status(500).json({ message: 'Erro ao fazer upload de imagens' });
    }
});

module.exports = router;
