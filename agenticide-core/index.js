const ProjectManager = require('./projectManager');
const CodeAnalyzer = require('./codeAnalyzer');
const ProjectTemplates = require('./projectTemplates');
const { TaskManager } = require('./taskManager');
const { DependencyResolver } = require('./dependencyResolver');
const { TaskExecutor } = require('./taskExecutor');

module.exports = {
    ProjectManager,
    ProjectIndex: require('./projectIndex'),
    TerminalManager: require('./terminalManager'),
    APITester: require('./apiTester'),
    CodeAnalyzer,
    ProjectTemplates,
    TaskManager,
    DependencyResolver,
    TaskExecutor
};
