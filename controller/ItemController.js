import { item_db } from "../db/db.js";
import ItemModel from "../model/ItemModel.js";

let selectedItemIndex = -1;
let currentItemId = item_db.length > 0 ?
    Math.max(...item_db.map(i => {
        const idStr = i.id.toString();
        return parseInt(idStr.startsWith('P') ? idStr.substring(1) : idStr);
    })) + 1 : 1;

// Initialize the page
$(document).ready(function () {
    generateNextItemId();
    loadItems();

    // Set up modal reset when shown
    $('#addProductModal').on('show.bs.modal', function () {
        if (selectedItemIndex === -1) {
            resetItemForm();
        }
    });
});

// Load items into the table
function loadItems() {
    $('#store_tbody').empty();

    if (item_db.length === 0) {
        $('#store_tbody').append('<tr><td colspan="8" class="text-center">No items found</td></tr>');
        return;
    }

    item_db.forEach((item, index) => {
        let row = `<tr data-index="${index}">
                      <td>${item.id}</td>
                      <td>${item.name}</td>
                      <td>${item.category || '-'}</td>
                      <td>Rs. ${item.price.toFixed(2)}</td>
                      <td>${item.qty}</td>
                      <td>${item.barcode || '-'}</td>
                      <td>${item.desc || '-'}</td>
                      <td>
                          <button class="btn btn-sm btn-warning edit-item-btn me-1" data-index="${index}">
                              <i class="bi bi-pencil"></i>
                          </button>
                          <button class="btn btn-sm btn-danger delete-item-btn" data-index="${index}">
                              <i class="bi bi-trash"></i>
                          </button>
                      </td>
                  </tr>`;
        $('#store_tbody').append(row);
    });
}

// Generate the next item ID
function generateNextItemId() {
    if (item_db.length === 0) {
        $('#id').val('P001');
        currentItemId = 1;
        return;
    }

    const maxId = Math.max(...item_db.map(item => {
        const idStr = item.id.toString();
        return parseInt(idStr.startsWith('P') ? idStr.substring(1) : idStr);
    }));

    currentItemId = maxId + 1;
    const nextId = 'P' + String(currentItemId).padStart(3, '0');
    $('#id').val(nextId);
}

// Save item to the database
$('#product_save').on('click', function () {
    let id = $('#id').val();
    let name = $('#productName').val().trim();
    let category = $('#productCategory').val();
    let price = parseFloat($('#productPrice').val());
    let qty = parseInt($('#productQuantity').val());
    let barcode = $('#productBarcode').val().trim();
    let desc = $('#productDescription').val().trim();

    // Validation
    if (!name || !category || isNaN(price) || isNaN(qty)) {
        Swal.fire({
            icon: "error",
            title: "Error!",
            text: "Please fill all required fields (Name, Category, Price, Quantity)!"
        });
        return;
    }

    if (price <= 0) {
        Swal.fire({
            icon: "error",
            title: "Invalid Price!",
            text: "Price must be greater than 0"
        });
        return;
    }

    if (qty < 0) {
        Swal.fire({
            icon: "error",
            title: "Invalid Quantity!",
            text: "Quantity cannot be negative"
        });
        return;
    }

    try {
        // Convert ID to number if it's in P001 format
        const numericId = id.startsWith('P') ? parseInt(id.substring(1)) : parseInt(id);

        // Create new item using ItemModel
        let item = new ItemModel(
            numericId,    // id
            name,        // name
            price,       // price
            category,    // category
            qty,         // qty
            barcode,     // barcode
            desc         // desc
        );

        if (selectedItemIndex !== -1) {
            // Update existing item
            item_db[selectedItemIndex] = item;
        } else {
            // Add new item
            item_db.push(item);
            generateNextItemId(); // Generate next ID for new items
        }

        loadItems();
        $('#addProductModal').modal('hide');

        Swal.fire({
            title: "Success!",
            text: `Item ${selectedItemIndex !== -1 ? 'updated' : 'added'} successfully`,
            icon: "success"
        });

        resetItemForm();
    } catch (e) {
        console.error("Error saving item:", e);
        Swal.fire({
            icon: "error",
            title: "Error!",
            text: "Failed to save item. Please check console for details."
        });
    }
});

// Edit item function
function editItem(index) {
    if (index === -1 || index >= item_db.length) return;

    selectedItemIndex = index;
    const item = item_db[index];

    // Format ID with P prefix if it's a number
    const displayId = typeof item.id === 'number' ? 'P' + String(item.id).padStart(3, '0') : item.id;

    $('#id').val(displayId);
    $('#productName').val(item.name);
    $('#productCategory').val(item.category || '');
    $('#productPrice').val(item.price);
    $('#productQuantity').val(item.qty);
    $('#productBarcode').val(item.barcode || '');
    $('#productDescription').val(item.desc || '');

    $('#addProductModal').modal('show');
}

// Delete item function
function deleteItem(index) {
    if (index === -1 || index >= item_db.length) {
        Swal.fire({
            icon: "warning",
            title: "No Selection!",
            text: "Please select a valid item first"
        });
        return;
    }

    const item = item_db[index];

    Swal.fire({
        title: "Are you sure?",
        html: `You are about to delete <strong>${item.name}</strong> (ID: ${item.id})`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Yes, delete it!"
    }).then((result) => {
        if (result.isConfirmed) {
            item_db.splice(index, 1);
            loadItems();
            resetItemForm();
            Swal.fire("Deleted!", "Item has been deleted.", "success");
        }
    });
}

// Search functionality
$('#store_content').on('keyup', '.input-group input', function () {
    const searchTerm = $(this).val().toLowerCase();

    $('#store_tbody tr').each(function () {
        const rowText = $(this).text().toLowerCase();
        $(this).toggle(rowText.includes(searchTerm));
    });
});

// Reset the form
function resetItemForm() {
    $('#addProductModal form')[0].reset();
    selectedItemIndex = -1;
    generateNextItemId();
    $('#productCategory').val('');
}

// Close modal handler
$('#addProductModal').on('hidden.bs.modal', function () {
    resetItemForm();
});

// Event delegation for edit and delete buttons
$(document).on('click', '.edit-item-btn', function(e) {
    e.stopPropagation();
    const index = $(this).data('index');
    editItem(index);
});

$(document).on('click', '.delete-item-btn', function(e) {
    e.stopPropagation();
    const index = $(this).data('index');
    deleteItem(index);
});