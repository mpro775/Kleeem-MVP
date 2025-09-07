const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// عدّل المسار/الاسم وفق سكيمة المستخدم عندك
const UserSchema = new mongoose.Schema({
  email: String,
  password: String,
  role: String,
});
const User = mongoose.model('User', UserSchema, 'users'); // collection: users

(async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI not set');
    await mongoose.connect(uri);

    const email = 'admin@kaleem.com';
    const newPass = process.argv[2]; // مرّر كلمة المرور الجديدة من سطر الأوامر
    if (!newPass) throw new Error('Provide new password as argv[2]');

    const hash = await bcrypt.hash(newPass, 10);
    const updated = await User.findOneAndUpdate(
      { email },
      { $set: { password: hash, role: 'ADMIN' } }, // غيّر الحقل إلى passwordHash إن كان اسمك مختلف
      { new: true },
    );

    if (!updated) {
      // لو ما وجد المستخدم، أنشئه كأدمن
      await User.create({ email, password: hash, role: 'ADMIN' });
      console.log('Admin created with new password.');
    } else {
      console.log('Admin password updated.');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
