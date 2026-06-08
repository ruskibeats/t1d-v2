---
name: T1D Companion
colors:
  surface: '#fbf9f9'
  surface-dim: '#dbdad9'
  surface-bright: '#fbf9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3fc'
  surface-container: '#ecedf6'
  surface-container-high: '#e6e8f0'
  surface-container-highest: '#e0e2ea'
  on-surface: '#1b1c1c'
  on-surface-variant: '#414752'
  inverse-surface: '#303031'
  inverse-on-surface: '#f2f0f0'
  outline: '#717783'
  outline-variant: '#c1c6d4'
  surface-tint: '#005faf'
  primary: '#005dac'
  on-primary: '#ffffff'
  primary-container: '#1976d2'
  on-primary-container: '#fffdff'
  inverse-primary: '#a5c8ff'
  secondary: '#1b6d24'
  on-secondary: '#ffffff'
  secondary-container: '#a0f399'
  on-secondary-container: '#217128'
  tertiary: '#9a4300'
  on-tertiary: '#ffffff'
  tertiary-container: '#ba5b00'
  on-tertiary-container: '#fffdff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  status-success-bg: '#E8F5E9'
  status-success-text: '#2E7D32'
  status-warning-bg: '#FFF3E0'
  status-warning-text: '#EF6C00'
  status-error-bg: '#FFEBEE'
  status-error-text: '#C62828'
  status-unknown-bg: '#F5F5F5'
  status-unknown-text: '#757575'
  medical-hypo: '#1976D2'
  medical-hypo-alert: '#0D47A1'
  medical-hyper: '#FF9800'
  medical-hyper-alert: '#E65100'
typography:
  headline-lg:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Manrope
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 1.2px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  screen-margin: 16px
  touch-target: 48px
---

# T1D Companion Mobile - Design System

## Overview

Design system specification for T1D Companion mobile app. This document provides AI agents with consistent styling, component patterns, and user experience guidelines for generating production-grade medical companion interfaces.

> Educational simulator only. All designs must maintain safety-first principles: no dosing/treatment recommendations, clear confidence indicators, and educational disclaimers.

## Design Principles

1. **Trust Through Transparency**: Confidence scores, data sources, and uncertainty bands always visible
2. **Calm Clinical UX**: Non-alarmist colors, accessible typography, medical-grade clarity
3. **Progressive Disclosure**: Simple defaults → detailed evidence on tap
4. **Inclusive Design**: WCAG AAA compliant, dynamic type support, screen reader optimized

## Screens

### 1. Today (Home Dashboard)
Mobile screen showing current glucose, trend indicator, and quick actions

### 2. Forecast Peak Card
Visual display of predicted glucose peaks with confidence bands

### 3. Forecast Results
Detailed forecast visualization with time-series chart

### 4. Meal Memory
Historical meal entries with nutritional breakdown

### 5. Log Meal
Two-step meal entry: description input + AI parser toggle

## Core Components

### Card Component
Surface containers with subtle borders and proper elevation

### Confidence Badge
Status indicators: High/Medium/Low with colored backgrounds

### Forecast Chart
SVG-based time-series visualization with prediction bands

### Food Evidence Row
Structured display of nutritional information

## Safety Patterns

Every medical-oriented screen must include:
1. Source label
2. Confidence indicator
3. Educational disclaimer
4. No dosing language