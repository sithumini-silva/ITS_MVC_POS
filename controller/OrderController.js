import {customers_db, item_db, order_db} from "../db/db.js";
import OrderModel from "../model/OrderModel.js";

let currentOrderItems = [];
let selectedCustomerId = null;

// Initialize the page
$(document).ready(function () {
    initializeOrderForm();
    loadOrdersOnTable();

    // Set up event listeners
    $('#addProductBtn').on('click', addProductToOrder);
    $('#order-place-btn').on('click', placeOrder);
    $('#new_order_btn').on('click', resetOrderForm);
    $('#search_order_btn, #search_orders').on('keyup click', function() {
        filterOrders($('#search_orders').val());
    });
});

function initializeOrderForm() {
    // Set current date
    const today = new Date().toISOString().split('T')[0];
    $('#orderDate').val(today);

    // Generate next order ID
    $('#orderId').val(`O${String(currentOrderId).padStart(3, '0')}`);

    // Populate dropdowns
    populateCustomerDropdown();
    populateProductDropdown();
}

// Load orders into the table
function loadOrdersOnTable() {
    $('#order_tbody').empty();

    if (order_db.length === 0) {
        $('#order_tbody').append('<tr><td colspan="6" class="text-center">No orders found</td></tr>');
        return;
    }

    order_db.forEach((order, index) => {
        const customer = customers_db.find(c => c.id == order.customer_id) || {};
        const totalAmount = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

        const row = `
        <tr data-index="${index}">
            <td>O${String(order.order_id).padStart(3, '0')}</td>
            <td>${customer.name || 'Unknown Customer'}</td>
            <td>${formatDisplayDate(order.date)}</td>
            <td>${itemCount}</td>
            <td>Rs. ${totalAmount.toFixed(2)}</td>
            <td>
                <button class="btn btn-sm btn-info view-order-btn" data-index="${index}">
                    <i class="bi bi-eye"></i> View
                </button>
            </td>
        </tr>`;
        $('#order_tbody').append(row);
    });

    // Add event listeners to view buttons
    $('.view-order-btn').on('click', function() {
        viewOrderDetails($(this).data('index'));
    });
}

// Format date for display
function formatDisplayDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function generateNextOrderId() {
    if (order_db.length === 0) {
        $('#orderId').val('O001');
        return;
    }

    const maxId = Math.max(...order_db.map(o =>
        parseInt(o.id.substring(1))));
    const nextId = 'O' + String(maxId + 1).padStart(3, '0');
    $('#orderId').val(nextId);
}

// Populate customer dropdown
function populateCustomerDropdown() {
    const dropdown = $('#orderCustomer');
    dropdown.empty();
    dropdown.append('<option value="">Select Customer</option>');

    customer_db.forEach(customer => {
        dropdown.append(`<option value="${customer.id}">${customer.name}</option>`);
    });
}

// Populate product dropdown
function populateProductDropdown() {
    const dropdown = $('#orderProductSelect');
    dropdown.empty();
    dropdown.append('<option value="">Select Product</option>');

    product_db.forEach(product => {
        if (product.quantity > 0) {
            dropdown.append(`<option value="${product.id}" data-price="${product.price}">${product.name}</option>`);
        }
    });
}

// Add product to current order
function addProductToOrder() {
    const productId = $('#orderProductSelect').val();
    const quantity = parseInt($('#orderProductQty').val());

    if (!productId || isNaN(quantity) || quantity <= 0) {
        showAlert('Error!', 'Please select a product and enter a valid quantity!', 'error');
        return;
    }

    const product = product_db.find(p => p.id === productId);
    if (!product) {
        showAlert('Error!', 'Selected product not found!', 'error');
        return;
    }

    if (quantity > product.quantity) {
        showAlert('Insufficient Stock!', `Only ${product.quantity} items available in stock!`, 'error');
        return;
    }

    // Check if product already exists in order
    const existingItemIndex = currentOrderItems.findIndex(item => item.id === productId);
    if (existingItemIndex !== -1) {
        // Update quantity if already exists
        const newQty = currentOrderItems[existingItemIndex].quantity + quantity;
        if (newQty > product.quantity) {
            showAlert('Insufficient Stock!', `Cannot add more than available stock (${product.quantity})!`, 'error');
            return;
        }
        currentOrderItems[existingItemIndex].quantity = newQty;
    } else {
        // Add new item
        currentOrderItems.push({
            id: product.id,
            name: product.name,
            price: product.price,
            quantity: quantity
        });
    }

    updateOrderItemsTable();
    $('#orderProductQty').val(1);
}

// Update the order items table
function updateOrderItemsTable() {
    const tableBody = $('#orderItemsTable');
    tableBody.empty();

    if (currentOrderItems.length === 0) {
        tableBody.append('<tr><td colspan="5" class="text-center">No items added</td></tr>');
        $('#orderTotalAmount').text('$0.00');
        return;
    }

    currentOrderItems.forEach((item, index) => {
        const row = `<tr>
            <td>${item.name}</td>
            <td>$${item.price.toFixed(2)}</td>
            <td>${item.quantity}</td>
            <td>$${(item.price * item.quantity).toFixed(2)}</td>
            <td><button class="btn btn-sm btn-danger remove-item-btn" data-index="${index}"><i class="bi bi-trash"></i></button></td>
        </tr>`;
        tableBody.append(row);
    });

    // Calculate and update total
    const total = currentOrderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    $('#orderTotalAmount').text(`$${total.toFixed(2)}`);

    // Add event listeners to remove buttons
    $('.remove-item-btn').on('click', function() {
        const index = $(this).data('index');
        currentOrderItems.splice(index, 1);
        updateOrderItemsTable();
    });
}

// Place the order
function placeOrder() {
    const customerId = $('#orderCustomer').val();
    const orderDate = $('#orderDate').val();
    const notes = $('#orderNotes').val();

    if (!customerId) {
        showAlert('Error!', 'Please select a customer!', 'error');
        return;
    }

    if (currentOrderItems.length === 0) {
        showAlert('Warning!', 'Please add at least one product to the order!', 'warning');
        return;
    }

    const customer = customers_db.find(c => c.id == customerId);
    if (!customer) {
        showAlert('Error!', 'Selected customer not found!', 'error');
        return;
    }

    // Calculate total amount
    const totalAmount = currentOrderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Create order
    const order = new OrderModel(
        orderDate,
        currentOrderId,
        customerId,
        customer.name,
        totalAmount,
        currentOrderItems,
        notes || null
    );

    // Update inventory
    currentOrderItems.forEach(orderItem => {
        const product = item_db.find(p => p.id == orderItem.id);
        if (product) {
            product.qty -= orderItem.quantity;
            if (product.qty < 0) product.qty = 0;
        }
    });

    // Save to database
    order_db.push(order);
    currentOrderId++;

    showAlert('Success!', `Order #O${String(order.order_id).padStart(3, '0')} placed successfully!`, 'success').then(() => {
        $('#createOrderModal').modal('hide');
        resetOrderForm();
        loadOrdersOnTable();
        populateProductDropdown(); // Refresh with updated quantities
    });
}

// View order details
function viewOrderDetails(index) {
    const order = order_db[index];
    if (!order) return;

    const customer = customers_db.find(c => c.id == order.customer_id) || {};
    const orderDate = formatDisplayDate(order.date);

    let itemsHtml = '';
    order.items.forEach(item => {
        itemsHtml += `<tr>
            <td>${item.name}</td>
            <td>Rs. ${item.price.toFixed(2)}</td>
            <td>${item.quantity}</td>
            <td>Rs. ${(item.price * item.quantity).toFixed(2)}</td>
        </tr>`;
    });

    const totalAmount = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    Swal.fire({
        title: `Order #O${String(order.order_id).padStart(3, '0')}`,
        html: `
            <div class="text-start">
                <p><strong>Date:</strong> ${orderDate}</p>
                <p><strong>Customer:</strong> ${customer.name || 'Unknown'}</p>
                <p><strong>Contact:</strong> ${customer.mobile || '-'} ${customer.email ? `<br>${customer.email}` : ''}</p>
                <div class="table-responsive mt-3">
                    <table class="table table-sm">
                        <thead class="table-light">
                            <tr>
                                <th>Product</th>
                                <th>Price</th>
                                <th>Qty</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                        </tbody>
                        <tfoot class="table-light">
                            <tr>
                                <th colspan="3" class="text-end">Total:</th>
                                <th>Rs. ${totalAmount.toFixed(2)}</th>
                            </tr>
                        </tfoot>
                    </table>
                </div>
                ${order.notes ? `<p class="mt-3"><strong>Notes:</strong><br>${order.notes}</p>` : ''}
            </div>
        `,
        width: '800px',
        confirmButtonText: 'Close'
    });
}

// Reset order form
function resetOrderForm() {
    currentOrderItems = [];
    updateOrderItemsTable();
    $('#orderCustomer').val('');
    $('#orderNotes').val('');
    $('#orderId').val(`O${String(currentOrderId).padStart(3, '0')}`);
    $('#orderDate').val(new Date().toISOString().split('T')[0]);
}

// Filter orders
function filterOrders(searchTerm) {
    const term = searchTerm.toLowerCase();
    $('#order_tbody tr').each(function() {
        const rowText = $(this).text().toLowerCase();
        $(this).toggle(rowText.includes(term));
    });
}

// Helper function to show alerts
function showAlert(title, text, icon) {
    return Swal.fire({
        title: title,
        text: text,
        icon: icon,
        confirmButtonText: 'OK'
    });
}