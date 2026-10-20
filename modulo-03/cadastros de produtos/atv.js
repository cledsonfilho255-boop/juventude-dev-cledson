"use strict";

const form = document.getElementById("product-form");
const successMessage = document.getElementById("success-message");
const storageError = document.getElementById("storage-error");
const storageStatus = document.getElementById("storage-status");
const productList = document.getElementById("product-list");
const productCount = document.getElementById("product-count");
const unitCount = document.getElementById("unit-count");
const recordCount = document.getElementById("record-count");
const storageKey = "catalogo_produtos_v1";
const trimmedFields = ["product-name", "product-brand", "product-description"]
  .map((id) => document.getElementById(id));
let storageAvailable = true;

function validateTrimmedField(field) {
  field.setCustomValidity(field.value.trim() ? "" : "Preencha este campo.");
}

function readProducts() {
  try {
    const savedValue = localStorage.getItem(storageKey);
    if (!savedValue) return [];

    const parsedValue = JSON.parse(savedValue);
    if (!Array.isArray(parsedValue)) throw new TypeError("Formato de inventário inválido.");

    return parsedValue.filter((product) =>
      product &&
      typeof product.id === "string" &&
      typeof product.name === "string" &&
      typeof product.brand === "string" &&
      typeof product.category === "string" &&
      typeof product.condition === "string" &&
      typeof product.state === "string" &&
      typeof product.description === "string" &&
      Number.isFinite(product.price) &&
      Number.isInteger(product.quantity) &&
      product.quantity >= 0 &&
      Number.isFinite(product.shipping) &&
      product.shipping >= 0
    );
  } catch {
    storageAvailable = false;
    return [];
  }
}

function updateStorageStatus() {
  storageStatus.textContent = storageAvailable
    ? "Armazenamento local ativo"
    : "Armazenamento local indisponível";
}

function saveProducts(nextProducts) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(nextProducts));
    storageAvailable = true;
    updateStorageStatus();
    return true;
  } catch {
    storageAvailable = false;
    updateStorageStatus();
    return false;
  }
}

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}

function addCell(row, className, value) {
  const cell = document.createElement("td");
  if (className) cell.className = className;
  cell.textContent = value;
  row.append(cell);
  return cell;
}

function renderProducts() {
  const fragment = document.createDocumentFragment();
  let totalUnits = 0;

  products.forEach((product) => {
    totalUnits += product.quantity;
    const row = document.createElement("tr");
    const productCell = document.createElement("td");
    productCell.className = "product-cell";
    const productName = document.createElement("strong");
    productName.textContent = product.name;
    const productDetails = document.createElement("small");
    productDetails.textContent = `${product.category} / ${product.condition}`;
    productCell.append(productName, productDetails);
    row.append(productCell);

    addCell(row, "", product.brand);
    addCell(row, "", formatCurrency(product.price));
    addCell(row, "", String(product.quantity));

    const shippingCell = document.createElement("td");
    shippingCell.className = "shipping-cell";
    const state = document.createElement("strong");
    state.textContent = product.state;
    const shipping = document.createElement("small");
    shipping.textContent = `Frete ${formatCurrency(product.shipping)}`;
    shippingCell.append(state, shipping);
    row.append(shippingCell);

    const actionCell = document.createElement("td");
    const removeButton = document.createElement("button");
    removeButton.className = "remove-button";
    removeButton.type = "button";
    removeButton.dataset.removeId = product.id;
    removeButton.setAttribute("aria-label", `Remover ${product.name}`);
    removeButton.textContent = "Remover";
    actionCell.append(removeButton);
    row.append(actionCell);
    fragment.append(row);
  });

  if (products.length === 0) {
    const row = document.createElement("tr");
    const emptyCell = document.createElement("td");
    emptyCell.className = "empty-state";
    emptyCell.colSpan = 6;
    emptyCell.textContent = "Nenhum produto registrado. Os novos itens aparecerão aqui.";
    row.append(emptyCell);
    fragment.append(row);
  }

  productList.replaceChildren(fragment);
  productCount.textContent = String(products.length).padStart(2, "0");
  unitCount.textContent = String(totalUnits).padStart(2, "0");
  recordCount.textContent = `${products.length} ${products.length === 1 ? "registro" : "registros"}`;
}

let products = readProducts();
updateStorageStatus();
renderProducts();

trimmedFields.forEach((field) => {
  field.addEventListener("input", () => validateTrimmedField(field));
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  trimmedFields.forEach(validateTrimmedField);
  form.classList.add("was-validated");
  successMessage.classList.add("d-none");
  storageError.classList.add("d-none");

  if (!form.checkValidity()) {
    form.querySelector(":invalid")?.focus();
    return;
  }

  const formData = new FormData(form);
  const product = {
    id: window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: String(formData.get("productName")).trim(),
    brand: String(formData.get("brand")).trim(),
    category: String(formData.get("category")),
    condition: String(formData.get("condition")),
    price: Number(formData.get("price")),
    quantity: Number(formData.get("quantity")),
    shipping: Number(formData.get("shipping")),
    state: String(formData.get("state")),
    description: String(formData.get("description")).trim()
  };
  const nextProducts = [product, ...products];

  if (!saveProducts(nextProducts)) {
    storageError.classList.remove("d-none");
    return;
  }

  products = nextProducts;
  renderProducts();
  form.reset();
  form.classList.remove("was-validated");
  successMessage.classList.remove("d-none");
});

form.addEventListener("reset", () => {
  form.classList.remove("was-validated");
  successMessage.classList.add("d-none");
  storageError.classList.add("d-none");
  trimmedFields.forEach((field) => field.setCustomValidity(""));
});

productList.addEventListener("click", (event) => {
  const removeButton = event.target.closest("[data-remove-id]");
  if (!removeButton) return;

  const nextProducts = products.filter((product) => product.id !== removeButton.dataset.removeId);
  if (!saveProducts(nextProducts)) {
    storageError.classList.remove("d-none");
    return;
  }

  products = nextProducts;
  renderProducts();
});