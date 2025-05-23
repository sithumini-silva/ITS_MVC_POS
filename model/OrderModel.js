export default class OrderModel {
    constructor(id, customerId, customerName, date, items, notes, status = 'completed') {
        this.id = id;
        this.customerId = customerId;
        this.customerName = customerName;
        this.date = date;
        this.items = items;
        this.notes = notes;
        this.status = status;
    }
}