// Toggle menu for small screens
document.querySelector('.menu-toggle').addEventListener('click', function() {
  const navUl = document.querySelector('.nav ul');
  navUl.classList.toggle('active');
});

// To-Do list functionality

const input = document.getElementById('todo-input');
const addBtn = document.getElementById('add-task-btn');
const todoList = document.getElementById('todo-list');

addBtn.addEventListener('click', addTask);
input.addEventListener('keypress', function(e) {
  if (e.key === 'Enter') {
    addTask();
  }
});

function addTask() {
  const taskText = input.value.trim();
  if (!taskText) {
    alert("Please enter a task");
    return;
  }

  const li = document.createElement('li');

  const span = document.createElement('span');
  span.textContent = taskText;
  span.addEventListener('click', function() {
    // Toggle completed
    li.classList.toggle('completed');
  });

  const delBtn = document.createElement('button');
  delBtn.textContent = 'Delete';
  delBtn.classList.add('delete-btn');
  delBtn.addEventListener('click', function() {
    li.remove();
  });

  li.appendChild(span);
  li.appendChild(delBtn);
  todoList.appendChild(li);

  delBtn.classList.add('delete-btn');
  delBtn.addEventListener('click', function() {
    li.remove();
  });  li.appendChild(span);  li.appendChild(delBtn);  todoList.appendChild(li);  input.value = '';}