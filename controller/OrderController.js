import { order_db, item_db, customers_db } from "../db/db.js";
import OrderModel from "../model/OrderModel.js";

let selectedOrderIndex = -1;
let currentOrderItems = [];

// Initialize the page
$(document).ready(function () {
    loadOrders();
    generateNextOrderId(); // Generate initial order ID

    // Set current date as default
    $('#orderDate').val(new Date().toISOString().split('T')[0]);

    // Add product to order
    $('#addProductBtn').on('click', function() {
        addProductToOrder();
    });

    // Place order button
    $('#order-place-btn').on('click', function() {
        placeOrder();
    });

    // New order button
    $('#new_order_btn').on('click', function() {
        generateNextOrderId();
        currentOrderItems = [];
        updateOrderItemsTable();
        $('#orderDate').val(new Date().toISOString().split('T')[0]);
        $('#orderNotes').val('');
        $('#orderCustomer').val(''); // Clear customer field
    });

    // Search orders
    $('#search_order_btn').on('click', function() {
        filterOrders($('#search_orders').val());
    });

    $('#search_orders').on('keyup', function() {
        filterOrders($(this).val());
    });
});

// Generate next order ID
function generateNextOrderId() {
    if (order_db.length === 0) {
        $('#orderId').val('O001');
        return;
    }
    const maxId = Math.max(...order_db.map(order => {
        const idStr = order.id.toString();
        const numPart = idStr.startsWith('O') ? idStr.substring(1) : idStr;
        return parseInt(numPart) || 0;
    }));

    const nextId = 'O' + String(maxId + 1).padStart(3, '0');
    $('#orderId').val(nextId);
}

// Add product to order items
function addProductToOrder() {
    const productId = $('#orderProductSelect').val();
    const quantity = parseInt($('#orderProductQty').val());

    if (!productId || isNaN(quantity) || quantity <= 0) {
        showAlert('Error!', 'Please select a product and enter a valid quantity!', 'error');
        return;
    }

    const product = item_db.find(p => p.id === productId || p.id.toString() === 'P' + productId.toString().padStart(3, '0'));
    if (!product) {
        showAlert('Error!', 'Selected product not found!', 'error');
        return;
    }

    if (quantity > product.qty) {
        showAlert('Insufficient Stock!', `Only ${product.qty} items available in stock!`, 'error');
        return;
    }

    // Check if product already exists in order
    const existingItemIndex = currentOrderItems.findIndex(item => item.id === productId);
    if (existingItemIndex !== -1) {
        // Update quantity if already exists
        const newQty = currentOrderItems[existingItemIndex].quantity + quantity;
        if (newQty > product.qty) {
            showAlert('Insufficient Stock!', `Cannot add more than available stock (${product.qty})!`, 'error');
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
        $('#orderTotalAmount').text('Rs. 0.00');
        return;
    }

    currentOrderItems.forEach((item, index) => {
        const row = `<tr>
            <td>${item.name}</td>
            <td>Rs. ${item.price.toFixed(2)}</td>
            <td>${item.quantity}</td>
            <td>Rs. ${(item.price * item.quantity).toFixed(2)}</td>
            <td><button class="btn btn-sm btn-danger remove-item-btn" data-index="${index}"><i class="bi bi-trash"></i></button></td>
        </tr>`;
        tableBody.append(row);
    });

    // Calculate and update total
    const total = currentOrderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    $('#orderTotalAmount').text(`Rs. ${total.toFixed(2)}`);

    // Add event listeners to remove buttons
    $('.remove-item-btn').on('click', function() {
        const index = $(this).data('index');
        currentOrderItems.splice(index, 1);
        updateOrderItemsTable();
    });
}

// Place the order
function placeOrder() {
    const customerName = $('#orderCustomer').val().trim();
    const orderDate = $('#orderDate').val();
    const notes = $('#orderNotes').val();

    if (!customerName) {
        showAlert('Error!', 'Please enter customer name!', 'error');
        return;
    }

    if (currentOrderItems.length === 0) {
        showAlert('Warning!', 'Please add at least one product to the order!', 'warning');
        return;
    }

    // Create order object
    const order = new OrderModel(
        $('#orderId').val(),
        null, // No customer ID since we're just using name
        customerName,
        orderDate,
        currentOrderItems,
        notes || null,
        'completed'
    );

    // Update product quantities in inventory
    currentOrderItems.forEach(orderItem => {
        const product = item_db.find(p => p.id === orderItem.id);
        if (product) {
            product.qty -= orderItem.quantity;
            if (product.qty < 0) product.qty = 0;
        }
    });

    // Save changes
    order_db.push(order);
    localStorage.setItem('order_db', JSON.stringify(order_db));
    localStorage.setItem('item_db', JSON.stringify(item_db));

    showAlert('Success!', `Order #${order.id} placed successfully!`, 'success').then(() => {
        $('#createOrderModal').modal('hide');
        loadOrders();
        generateNextOrderId(); // Generate next ID for new order
    });
}

// Load orders into the table
function loadOrders() {
    $('#order_tbody').empty();

    if (order_db.length === 0) {
        $('#order_tbody').append('<tr><td colspan="6" class="text-center">No orders found</td></tr>');
        return;
    }

    order_db.forEach((order, index) => {
        const orderDate = order.date ?
            (order.date instanceof Date ?
                order.date.toLocaleDateString() :
                new Date(order.date).toLocaleDateString()) :
            '-';

        const totalItems = order.items ?
            order.items.reduce((sum, item) => sum + (item.quantity || 0), 0) :
            0;

        const totalPrice = order.items ?
            order.items.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0) :
            0;

        let row = `<tr data-index="${index}">
            <td>${order.id || '-'}</td>
            <td>${order.customerName || order.customer || '-'}</td>
            <td>${orderDate}</td>
            <td>${totalItems}</td>
            <td>Rs. ${totalPrice.toFixed(2)}</td>
            <td>
                <button class="btn btn-sm btn-info view-order-btn" data-index="${index}">
                    <i class="bi bi-eye"></i> Invoice
                </button>
            </td>
        </tr>`;
        $('#order_tbody').append(row);
    });

    // Add event listeners to view buttons
    $('.view-order-btn').on('click', function() {
        const index = $(this).data('index');
        viewOrderDetails(index);
    });
}

// View order details
function viewOrderDetails(index) {
    const order = order_db[index];
    if (!order) return;

    const orderDate = order.date ?
        (order.date instanceof Date ?
            order.date.toLocaleDateString() :
            new Date(order.date).toLocaleDateString()) :
        '-';

    let customerInfo = order.customerName || 'Customer not specified';

    let itemsHtml = '';
    order.items.forEach(item => {
        itemsHtml += `<tr>
            <td>${item.name}</td>
            <td>Rs. ${item.price.toFixed(2)}</td>
            <td>${item.quantity}</td>
            <td>Rs. ${(item.price * item.quantity).toFixed(2)}</td>
        </tr>`;
    });

    const totalPrice = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    Swal.fire({
        title: `Order #${order.id}`,
        html: `
            <div class="text-start">
                <p><strong>Date:</strong> ${orderDate}</p>
                <p><strong>Customer:</strong><br>${customerInfo}</p>
                <div class="table-responsive">
                    <table class="table table-sm">
                        <thead>
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
                        <tfoot>
                            <tr>
                                <th colspan="3">Total</th>
                                <th>Rs. ${totalPrice.toFixed(2)}</th>
                            </tr>
                        </tfoot>
                    </table>
                </div>
                ${order.notes ? `<p><strong>Notes:</strong> ${order.notes}</p>` : ''}
            </div>
        `,
        width: '800px',
        confirmButtonText: 'Close'
    });
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

// Load customers into the customer combo box
function loadCustomersToComboBox() {
    const customerSelect = $('#orderCustomer');
    customerSelect.empty();
    customerSelect.append('<option value="">Select Customer</option>');

    customers_db.forEach(customer => {
        customerSelect.append(`<option value="${customer.name}">${customer.name}</option>`);
    });
}

// Load products into the product combo box
function loadProductsToComboBox() {
    const productSelect = $('#orderProductSelect');
    productSelect.empty();
    productSelect.append('<option value="">Select Product</option>');

    item_db.forEach(product => {
        productSelect.append(`<option value="${product.id}">${product.name}</option>`);
    });
}
$('#new_order_btn').on('click', function() {
    generateNextOrderId();
    currentOrderItems = [];
    updateOrderItemsTable();
    $('#orderDate').val(new Date().toISOString().split('T')[0]);
    $('#orderNotes').val('');
    $('#orderCustomer').val('');
    loadCustomersToComboBox();
    loadProductsToComboBox();
});
