export class User {
  id: string;
  email: string;
  role: 'Shipper' | 'Carrier';

  constructor(data: any) {
    this.id = data.id || data._id;
    this.email = data.email;
    this.role = data.role;
  }
}
