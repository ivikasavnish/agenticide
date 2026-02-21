console.log('🎯 Workflow Board loaded!');

let currentStage = '';
let tasks = {
    todo: [],
    progress: [],
    review: [],
    done: []
};

const modal = document.getElementById('task-modal');
const taskTitle = document.getElementById('task-title');
const taskDescription = document.getElementById('task-description');
const createBtn = document.getElementById('create-btn');
const cancelBtn = document.getElementById('cancel-btn');

document.querySelectorAll('.add-task-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        currentStage = btn.dataset.stage;
        modal.classList.add('active');
        taskTitle.focus();
    });
});

cancelBtn.addEventListener('click', () => {
    modal.classList.remove('active');
    taskTitle.value = '';
    taskDescription.value = '';
});

createBtn.addEventListener('click', () => {
    if (taskTitle.value.trim()) {
        addTask(currentStage, taskTitle.value, taskDescription.value);
        modal.classList.remove('active');
        taskTitle.value = '';
        taskDescription.value = '';
    }
});

modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        cancelBtn.click();
    }
});

function addTask(stage, title, description = '') {
    const task = {
        id: Date.now(),
        title,
        description,
        createdAt: new Date().toLocaleString()
    };
    
    tasks[stage].push(task);
    renderTasks();
    updateStats();
}

function renderTasks() {
    ['todo', 'progress', 'review', 'done'].forEach(stage => {
        const list = document.getElementById(`${stage}-list`);
        list.innerHTML = '';
        
        tasks[stage].forEach(task => {
            const card = document.createElement('div');
            card.className = 'task-card';
            card.draggable = true;
            card.dataset.id = task.id;
            card.dataset.stage = stage;
            
            card.innerHTML = `
                <div class="task-title">${task.title}</div>
                ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
                <div class="task-time">${task.createdAt}</div>
            `;
            
            card.addEventListener('dragstart', handleDragStart);
            card.addEventListener('dragend', handleDragEnd);
            
            list.appendChild(card);
        });
        
        const column = document.querySelector(`[data-stage="${stage}"]`);
        column.querySelector('.task-count').textContent = tasks[stage].length;
    });
    
    setupDropZones();
}

function handleDragStart(e) {
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.innerHTML);
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
}

function setupDropZones() {
    document.querySelectorAll('.tasks-list').forEach(list => {
        list.addEventListener('dragover', (e) => {
            e.preventDefault();
            const draggingCard = document.querySelector('.dragging');
            if (draggingCard) {
                list.appendChild(draggingCard);
            }
        });
        
        list.addEventListener('drop', (e) => {
            e.preventDefault();
            const draggingCard = document.querySelector('.dragging');
            if (draggingCard) {
                const oldStage = draggingCard.dataset.stage;
                const newStage = list.id.replace('-list', '');
                const taskId = parseInt(draggingCard.dataset.id);
                
                const taskIndex = tasks[oldStage].findIndex(t => t.id === taskId);
                if (taskIndex > -1) {
                    const [task] = tasks[oldStage].splice(taskIndex, 1);
                    tasks[newStage].push(task);
                    renderTasks();
                    updateStats();
                }
            }
        });
    });
}

function updateStats() {
    const total = Object.values(tasks).reduce((sum, arr) => sum + arr.length, 0);
    const completed = tasks.done.length;
    
    document.getElementById('total-tasks').textContent = total;
    document.getElementById('completed-tasks').textContent = completed;
}

addTask('todo', 'Design new feature', 'Create mockups and prototypes');
addTask('todo', 'Review pull request', 'Check code quality and tests');
addTask('progress', 'Implement API endpoint', 'RESTful API for user management');
addTask('review', 'Write documentation', 'API docs and user guide');
addTask('done', 'Setup project', 'Initialize repository and dependencies');

const ws = new WebSocket('ws://' + location.host);

ws.onopen = () => {
    console.log('✓ Connected to design server');
};

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('Message from server:', data);
};