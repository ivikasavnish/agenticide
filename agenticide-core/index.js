const ProjectManager = require('./projectManager');
const CodeAnalyzer = require('./codeAnalyzer');
const ProjectTemplates = require('./projectTemplates');

module.exports = {
    ProjectManager,
    ProjectIndex: require('./projectIndex'),
    TerminalManager: require('./terminalManager'),
    APITester: require('./apiTester'),
    CodeAnalyzer,
    ProjectTemplates
};
