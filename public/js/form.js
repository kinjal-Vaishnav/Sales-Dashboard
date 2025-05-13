function openForm() {
    document.getElementById('popup-form').style.display = 'block';
  }
  
  function closeForm() {
    document.getElementById('popup-form').style.display = 'none';
  }
  
  function submitForm(isNew) {
    event.preventDefault();
    const form = document.getElementById('accountForm');
    const formData = new FormData(form);
  
    fetch('/save-entry', {
      method: 'POST',
      body: new URLSearchParams(formData)
    }).then(() => {
      if (isNew) {
        form.reset();
      } else {
        closeForm();
      }
    });
  }
  