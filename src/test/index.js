const myForm = document.querySelector("#myForm");
const myFileInput = document.querySelector("#file");
myForm.addEventListener("submit", (event) => {
  event.preventDefault();
  let formData = new FormData(myForm);
  console.log(formData);
  fetch("http://localhost:3000/upload", {
    method: "POST",
    body: formData,
  })
    .then((result) => result.json())
    .then((data) => console.log(data))
    .catch((error) => console.log(error));
});
