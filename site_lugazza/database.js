// database.js
const mongoose = require('mongoose');

// Schema para Clientes
const ClientSchema = new mongoose.Schema({
    username: { type: String, required: true },
    password: { type: String, required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    role: { type: String, default: 'client' }
});

// Schema para Projetos
const ProjectSchema = new mongoose.Schema({
    name: { type: String, required: true },
    currentStage: { type: String, required: true },
    progress: { type: Number, default: 0 },
    lastUpdated: { type: Date, required: true, default: Date.now },
    images: [{ type: String }],
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' }
});

// Exportação dos modelos
const Client = mongoose.model('Client', ClientSchema);
const Project = mongoose.model('Project', ProjectSchema);

module.exports = { Client, Project };
