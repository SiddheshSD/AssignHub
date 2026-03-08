# AssignHub 📚

**AssignHub** is a premium, offline-first mobile application expertly designed to help students systematically manage, track, and optimize their academic progress. Built with React Native and Expo, the app features a highly intuitive user interface seamlessly managing subjects, assignments, experiments, and associated files—all without needing an internet connection.

## ✨ Features

- **📊 Intelligent Dashboard**: 
  - Get a robust overview of your total progress featuring a dynamic **Pie Chart** for tracking the statuses of all your tasks (`Not Given`, `Incomplete`, `Complete`, `Checked`).
  - Visualize your academic performance with a **Marks Graph**, outlining the average scores across assignments and experiments for all subjects.
  - Quick-access **Recent Subjects** list that updates instantly whenever modifications are made, putting your most active subjects just a tap away.

- **📚 Advanced Subject Management**:
  - Seamlessly add, edit, and delete subjects with unique codes and track varying numbers of assignments or experiments (even setting counts to zero).

- **📝 Marks Integration**:
  - Input specific marks achieved for every single assignment or experiment.
  - Customize the maximum "Out of" marks uniquely for assignments and differently for experiments per subject.

- **📁 Smart File Management**:
  - Attach files to specific assignments and experiments directly using `expo-document-picker`.
  - Intelligently organizes all attachments into dedicated subject-specific folders (e.g., `Maths_CSC401`).
  - Auto-renames files uniquely (e.g., `Assignment_1_Maths.pdf`) avoiding overrides and confusion.
  - Successfully parses and handles extremely large files seamlessly (up to **250MB**) with memory efficiency—say goodbye to `OutOfMemoryErrors`!

- **✅ Progressive Status Tracking**:
  - Cycle effortlessly through the life cycle of every task: `Not Given` ➔ `Incomplete` ➔ `Complete` ➔ `Checked`.

- **🌓 Dynamic Theming**:
  - Choose between Light, Dark, or automatically match your System's preference, accented with a vibrant primary color (`#6C63FF`) across a cohesive UI.

- **💾 100% Offline Persistence**:
  - Your data is completely localized on the device harnessing `AsyncStorage` and the File System—lightning fast and fully private.

## 🚀 Tech Stack

- **Framework**: [Expo](https://expo.dev/) (SDK 54) / [React Native](https://reactnative.dev)
- **Navigation**: [React Navigation 7](https://reactnavigation.org/) (Bottom Tabs & Native Stack)
- **State & Data Handling**: React Context API
- **Local Storage**: `@react-native-async-storage/async-storage` & `expo-file-system`
- **File & Media Handling**: `expo-document-picker`, `expo-sharing`, `expo-intent-launcher`
- **Charts & Layout**: `react-native-svg`
- **Notifications**: `expo-notifications` for seamless local reminders

## 📂 Project Structure

```text
AssignHUB/
├── src/
│   ├── constants/        # Theme definitions (Colours, Styles), global constants
│   ├── context/          # Context Providers (Theme and Data persistence)
│   ├── navigation/       # Navigation configuration (BottomTabs, Stack Routing)
│   ├── screens/          # Application screens (Dashboard, Subjects, Settings, Add/Detail)
│   └── services/         # Storage managers, Notifications, and the core FileManager 
├── App.js                # Core App Entry point
└── app.json              # Expo configuration (Permissions, plugins, bundle identifiers)
```

## 🛠️ Installation & Setup

### Prerequisites
- [Node.js](https://nodejs.org/) installed
- **Expo Go** app on your physical mobile device, or configured Emulator/Simulator

### Steps to Run Correctly
1. **Clone the repository**:
   ```bash
   git clone <repository_url>
   cd AssignHUB
   ```

2. **Install all dependencies**:
   ```bash
   npm install
   ```
   *(Note: This installs all peer dependencies handled efficiently under Node 18+ and React 19).*

3. **Start the Expo server**:
   ```bash
   npx expo start -c
   ```
   *(We run `-c` to clear cache and ensure smooth loading)*

4. **Launch the App**:
   - For **Android**: Scan the QR code with the Expo Go app. Alternatively, press `a` to load on a configured emulator.
   - For **iOS**: Open the Camera app to scan the QR code and prompt Expo Go, or press `i` for the standard simulator.

## 📖 Usage Guide

- **Dashboard**: Upon opening, you will land on the Dashboard. Review your aggregated status pie chart and your average performance graph. Tap on any subject in your 'Recently Updated' list to jump quickly back into work.
- **Subjects Setup**: Tap the 'Subjects' tab at the bottom and hit the powerful `+` button in the top right.
- **Details and Marks**: From any subject's Detail screen, tap to toggle item statuses, input achieved marks, or attach related files/receipts directly to an assignment item. All configurations accurately persist instantly.
- **Theme and Info**: Manage global settings including UI aesthetics (Dark Mode) or visit the About section to see credits and external references in the 'Settings' tab.

## 📥 Downloads / Releases

Download the specific version installed builds below (APK/AAB configurations generated via EAS). I've left the placeholder `URL_HERE` strings for you to paste your specific Expo download links!

- [Version 1.2.4 (Latest)](https://expo.dev/accounts/siddhesh_2005/projects/AssignHUB/builds/44041141-a05d-4af7-a075-63ff000e5abe)
- [Version 1.2.2](https://expo.dev/accounts/siddhesh_2005/projects/AssignHUB/builds/3ea6c312-e769-4c5b-bcfe-66a9915c2305)
- [Version 1.2.1](https://expo.dev/accounts/siddhesh_2005/projects/AssignHUB/builds/d65b0d43-931c-4506-9fc0-8be0ad62316b)
- [Version 1.2.0](https://expo.dev/accounts/siddhesh_2005/projects/AssignHUB/builds/8ee5a044-1cb6-4fc8-9e39-fe601b7e0e17)
- [Version 1.1.0](https://expo.dev/accounts/siddhesh_2005/projects/AssignHUB/builds/b6818a21-ac26-48e6-a4fa-de32e1d27f21)
- [Version 1.0.0](https://expo.dev/accounts/siddhesh_2005/projects/AssignHUB/builds/69aa9150-e547-437d-a908-87ba89ac994a)

---
Built with ❤️ for students executing with total focus.
