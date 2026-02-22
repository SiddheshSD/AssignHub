# AssignHub 📚

**AssignHub** is a premium, offline-first mobile application designed to help students track their academic progress seamlessly. Built with React Native and Expo, it offers a clean, modern interface to manage subjects, assignments, and experiments with ease.

![App Header](https://via.placeholder.com/800x400.png?text=AssignHub+-+Assignment+Tracking+Made+Easy)

## ✨ Features

- **📊 Intelligent Dashboard**: Get an at-a-glance overview of your total progress. Features circular progress indicators and detailed stat cards for subjects, assignments, and experiments.
- **📚 Subject Management**: Add, edit, and delete subjects. Customize the number of assignments and experiments for each subject.
- **✅ Status Tracking**: Cycle through item statuses: `Not Given` ➔ `Incomplete` ➔ `Complete` ➔ `Checked`.
- **🌓 Dynamic Theming**: Supports Light, Dark, and System modes with a beautiful `#6C63FF` primary accent. Styling is consistent and premium across all screens.
- **💾 Offline Persistence**: All data is stored locally on your device using `AsyncStorage`, ensuring your information is always accessible without an internet connection.
- **📱 Responsive Design**: Optimized for both iOS and Android with smooth animations and intuitive navigation.

## 🚀 Tech Stack

- **Framework**: [Expo](https://expo.dev/) (SDK 54) / React Native
- **Navigation**: [React Navigation](https://reactnavigation.org/) (Bottom Tabs & Native Stack)
- **State Management**: React Context API
- **Storage**: @react-native-async-storage/async-storage
- **Icons**: @expo/vector-icons (Material Community Icons)
- **UI Components**: React Native SVG for progress charts

## 📂 Project Structure

```text
AssignHUB/
├── src/
│   ├── components/       # Reusable UI components
│   ├── constants/        # Theme definitions and global constants
│   ├── context/          # Data and Theme Context Providers
│   ├── navigation/       # Navigation configuration (BottomTabs, Stacks)
│   ├── screens/          # Application screens (Dashboard, Subjects, Details, etc.)
│   └── services/         # Storage and utility services
├── App.js                # Entry point
└── package.json          # Dependencies and scripts
```

## 🛠️ Installation & Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (LTS)
- [Expo Go](https://expo.dev/client) app on your mobile device (to preview)

### Setup Steps
1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/assignhub.git
   cd assignhub
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npx expo start
   ```

4. **Run the app**:
   - Scan the QR code using **Expo Go** (Android) or the **Camera app** (iOS).
   - Alternatively, press `a` for Android Emulator or `i` for iOS Simulator.

## 📖 Usage Guide

- **Adding a Subject**: Navigate to the `Subjects` tab and tap the '+' button. Fill in the subject name, code, and counts.
- **Updating Status**: On the `Subject Detail` screen, tap any assignment or experiment badge to cycle through its status.
- **Editing Suject**: Tap the pencil icon in the `Subject Detail` header to change the code or adjust the number of items.
- **Changing Theme**: Go to `Settings` to switch between Light, Dark, or System theme.

---

Built with ❤️ for students who want to stay organized.
