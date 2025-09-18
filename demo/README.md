# limitedlet Interactive Demo

An interactive React application showcasing `limitedlet` - limited mutable variables that sit between `const` and `let`, allowing only a specific number of mutations before becoming immutable.

> **New to limitedlet?** This demo provides hands-on exploration of controlled mutability patterns. See the [main package](../) for core documentation.

## Features Demonstrated

### 1. Limited Counter
- Basic usage with mutation tracking
- Visual feedback for remaining mutations
- Automatic disabling when depleted

### 2. Form Validation with Limited Retries
- Practical use case for limiting retry attempts
- Integration with React state
- Error handling and user feedback

### 3. Configuration Object Management
- Limited modifications to configuration objects
- Object mutation tracking
- History tracking demonstration

### 4. Game Mechanics
- Power-up system with limited uses
- Score integration
- Multiple action types with single mutation counter

### 5. Custom React Hook
- `useLimitedLet` hook for easy React integration
- Automatic re-rendering on mutations
- TypeScript support

## Quick Start

From the repository root:

```bash
# Clone the repository (if not already done)
git clone https://github.com/username/limitedlet.git
cd limitedlet/demo

# Install dependencies
npm install

# Start the interactive demo
npm run dev
```

The demo will open automatically in your browser at `http://localhost:9001`.

## Why an Interactive Demo?

While the [core documentation](../) explains the concepts, this demo lets you:
- **Click and experiment** with different mutation patterns
- **See real-time feedback** as limits are reached
- **Experience the callbacks** and violation tracking in action
- **Understand practical applications** through working examples
- **Test strict vs non-strict modes** interactively

## Key Concepts Demonstrated

- **React Integration**: `useLimitedLet` hook with automatic re-rendering
- **Strict vs Non-Strict Modes**: Production enforcement vs development tracking
- **Violation Tracking**: Granular behavior monitoring without blocking users
- **TypeScript Support**: Full type safety with generic types
- **Error Handling**: Graceful limit violation management
- **Real-World Use Cases**: Form retries, game mechanics, configuration limits

## Files Structure

- `src/App.tsx` - Main application with all examples
- `src/index.tsx` - React application bootstrap
- `src/index.css` - Styling for the examples
- `package.json` - Dependencies and scripts
- `vite.config.ts` - Vite build configuration
- `tsconfig.json` - TypeScript configuration

## Building for Production

```bash
npm run build
```

The built application will be in the `dist` directory.