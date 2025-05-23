import {customers_db} from "../db/db.js";
import CustomerModel from "../model/CustomerModel.js";

let selectedCustomerIndex = -1;

// Initialize the page
$(document).ready(function () {
    generateNextCustomerId();
    loadCustomers();
});

// Load customers into the table
function loadCustomers() {
    $('#customer_tbody').empty();

    if (customers_db.length === 0) {
        $('#customer_tbody').append('<tr><td colspan="6" class="text-center">No customers found</td></tr>');
        return;
    }

    customers_db.forEach((customer, index) => {
        let row = `<tr data-index="${index}">
                      <td>${customer.id}</td>
                      <td>${customer.name}</td>
                      <td>${customer.mobile}</td>
                      <td>${customer.email || '-'}</td>
                      <td>${customer.address || '-'}</td>
                      <td>
                          <button class="btn btn-sm btn-danger delete-customer-btn" data-index="${index}">
                              <i class="bi bi-trash"></i>
                          </button>
                      </td>
                  </tr>`;
        $('#customer_tbody').append(row);
    });

    // Add click event for delete buttons
    $('.delete-customer-btn').on('click', function(e) {
        e.stopPropagation();
        const index = $(this).data('index');
        deleteCustomer(index);
    });
}

// Generate the next customer ID
function generateNextCustomerId() {
    if (customers_db.length === 0) {
        $('#customer_id').val('C001');
        return;
    }
    const maxId = Math.max(...customer_db.map(c =>
        parseInt(c.id.substring(1))));
    const nextId = 'C' + String(maxId + 1).padStart(3, '0');
    $('#customer_id').val(nextId);
}

// Delete customer function
function deleteCustomer(index) {
    if (index === -1 || index >= customers_db.length) {
        Swal.fire({
            icon: "warning",
            title: "No Selection!",
            text: "Please select a valid customer first"
        });
        return;
    }

    const customer = customers_db[index];

    Swal.fire({
        title: "Are you sure?",
        html: `You are about to delete <strong>${customer.name}</strong> (ID: ${customer.id})`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Yes, delete it!"
    }).then((result) => {
        if (result.isConfirmed) {
            customers_db.splice(index, 1);
            loadCustomers();
            resetCustomerForm();
            Swal.fire("Deleted!", "Customer has been deleted.", "success");
        }
    });
}

// Save customer to the database
$('#customer_save').on('click', function () {
    let id = $('#customer_id').val();
    let name = $('#customerName').val().trim();
    let mobile = $('#customerPhone').val().trim();
    let email = $('#customerEmail').val().trim();
    let address = $('#customerAddress').val().trim();

    // Validation
    if (!name || !address || !mobile) {
        Swal.fire({
            icon: "error",
            title: "Error!",
            text: "Please fill all required fields!"
        });
        return;
    }

    // Phone number validation
    if (!/^0[1-9][0-9]{8}$/.test(mobile)) {
        Swal.fire({
            icon: "error",
            title: "Invalid Phone!",
            text: "Please enter a valid Sri Lankan phone number (10 digits starting with 0)"
        });
        return;
    }

    // Email validation
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        Swal.fire({
            icon: "error",
            title: "Invalid Email!",
            text: "Please enter a valid email address"
        });
        return;
    }

    let customer_data = new CustomerModel(
        parseInt(id),
        name,
        address,
        mobile,
        email
    );

    // Check if we're updating an existing customer
    if (selectedCustomerIndex !== -1) {
        customers_db[selectedCustomerIndex] = customer_data;
    } else {
        customers_db.push(customer_data);
    }

    loadCustomers();

    Swal.fire({
        title: "Success!",
        text: `Customer ${selectedCustomerIndex !== -1 ? 'updated' : 'added'} successfully`,
        icon: "success"
    }).then(() => {
        $('#addCustomerModal').modal('hide');
        resetCustomerForm();
    });
});

// Select a customer from the table
$('#customer_tbody').on('click', 'tr', function (e) {
    if ($(e.target).hasClass('delete-customer-btn') || $(e.target).parents('.delete-customer-btn').length) {
        return;
    }

    selectedCustomerIndex = $(this).data('index');
    const customer = customers_db[selectedCustomerIndex];

    $('#customer_id').val(customer.id);
    $('#customerName').val(customer.name);
    $('#customerPhone').val(customer.mobile);
    $('#customerEmail').val(customer.email || '');
    $('#customerAddress').val(customer.address || '');

    $('#addCustomerModal').modal('show');
});

// Search functionality
$('.input-group input').on('keyup', function () {
    const searchTerm = $(this).val().toLowerCase();

    $('#customer_tbody tr').each(function () {
        const rowText = $(this).text().toLowerCase();
        $(this).toggle(rowText.includes(searchTerm));
    });
});

// Reset the form
function resetCustomerForm() {
    $('#customerForm')[0].reset();
    selectedCustomerIndex = -1;
    generateNextCustomerId();
}

// Close modal handler
$('#addCustomerModal').on('hidden.bs.modal', function () {
    resetCustomerForm();
});