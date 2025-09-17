document.getElementById('contactForm').addEventListener('submit', function(event) {
  // Prevent default submission
  event.preventDefault();
  
  // Clear previous error messages
  const errorElements = document.querySelectorAll('.error-message');
  errorElements.forEach(el => el.remove());

  let isValid = true;
  let firstInvalid = null;

  // Name validation
  const nameInput = document.getElementById('name');
  if (!nameInput.value.trim()) {
    showError(nameInput, "Name is required");
    isValid = false;
    if (!firstInvalid) firstInvalid = nameInput;
  }

  // Email validation
  const emailInput = document.getElementById('email');
  if (!emailInput.value.trim()) {
    showError(emailInput, "Email is required");
    isValid = false;
    if (!firstInvalid) firstInvalid = emailInput;
  } else if (!validateEmail(emailInput.value.trim())) {
    showError(emailInput, "Enter a valid email address");
    isValid = false;
    if (!firstInvalid) firstInvalid = emailInput;
  }

  // Message validation
  const messageInput = document.getElementById('message');
  if (!messageInput.value.trim()) {
    showError(messageInput, "Message is required");
    isValid = false;
    if (!firstInvalid) firstInvalid = messageInput;
  }

  if (!isValid && firstInvalid) {
    firstInvalid.focus();
  }

  if (isValid) {
    // All good: you can submit the form (e.g. send data), or show a success message
    alert("Form submitted successfully!");
    event.target.reset();
  }
});

function showError(inputElem, message) {
  const error = document.createElement('div');
  error.className = 'error-message';
  error.style.color = 'red';
  error.style.fontSize = '0.9em';
  error.innerText = message;
  inputElem.parentElement.appendChild(error);
}

function validateEmail(email) {
  // simple regex for basic email format
  const re = /\S+@\S+\.\S+/;
  return re.test(email);
}
