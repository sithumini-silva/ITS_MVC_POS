export default class ItemModel {
    constructor(id, name, price, category, qty,barcode, desc) {
        this.id = id;
        this.name = name;
        this.price = price;
        this.category = category;
        this.qty = qty;
        this.barcode = barcode;
        this.desc = desc;
    }
}