// Central registry for all command actions
// Keeps index.js lean by exporting all action handlers

const initAction = require('./initAction');
const chatAction = require('./chatAction');
const { createTaskAddAction, createTaskListAction, createTaskCompleteAction } = require('./taskActions');
const { createConfigSetAction, createConfigShowAction } = require('./configActions');
const createAnalyzeAction = require('./analyzeAction');

module.exports = function createActions(dependencies) {
    return {
        init: initAction(
            dependencies.banner,
            dependencies.loadConfig,
            dependencies.saveTasks
        ),
        
        chat: chatAction(dependencies),
        
        taskAdd: createTaskAddAction(
            dependencies.TASKS_FILE,
            dependencies.loadTasks,
            dependencies.saveTasks
        ),
        
        taskList: createTaskListAction(
            dependencies.TASKS_FILE,
            dependencies.loadTasks
        ),
        
        taskComplete: createTaskCompleteAction(
            dependencies.TASKS_FILE,
            dependencies.loadTasks,
            dependencies.saveTasks
        ),
        
        configSet: createConfigSetAction(
            dependencies.loadConfig,
            dependencies.saveConfig
        ),
        
        configShow: createConfigShowAction(
            dependencies.loadConfig
        ),
        
        analyze: createAnalyzeAction(dependencies.CONFIG_DIR)
    };
};
