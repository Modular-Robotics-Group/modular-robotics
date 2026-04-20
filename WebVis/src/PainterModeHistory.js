/*
 * PainterModeHistory class
 * Manages undo/redo functionality for painter mode edits (module placement, color, type, static toggle)
 * Stores snapshots of the full configuration and allows restoring to previous states
 */

import * as THREE from 'three';
import { gModules, gScene, gRenderer } from "./main.js";
import { Module } from "./Module.js";
import { VisConfigData } from "./utils.js";

/**
 * ConfigurationSnapshot - stores the state of all modules at a point in time
 */
class ConfigurationSnapshot {
    constructor() {
        this.modules = {};
        this.timestamp = Date.now();
        // Deep copy current module configuration
        for (const moduleId in gModules) {
            const mod = gModules[moduleId];
            this.modules[moduleId] = {
                moduleType: mod.moduleType,
                id: mod.id,
                x: mod.pos.x,
                y: mod.pos.y,
                z: mod.pos.z,
                color: mod.color,
                scale: mod.scale,
                isStatic: mod.isStatic
            };
        }
    }
}

/**
 * PainterModeHistory - manages undo/redo stacks for painter mode
 */
export class PainterModeHistory {
    constructor() {
        this.undoStack = [];
        this.redoStack = [];
        this.maxHistorySize = 50; // Limit history to prevent memory bloat
    }

    /**
     * Capture current configuration and push to undo stack
     * @param {string} description - Description of the action for debugging
     */
    pushSnapshot(description = "") {
        // Push current config to undo stack
        this.undoStack.push(new ConfigurationSnapshot());
        
        // Limit history size
        if (this.undoStack.length > this.maxHistorySize) {
            this.undoStack.shift();
        }
        
        // Clear redo stack when new action is performed
        this.redoStack = [];
    }

    /**
     * Undo last action - restore to previous snapshot
     */
    undo() {
        if (this.undoStack.length === 0) {
            console.warn("Nothing to undo");
            return;
        }

        // Push current state to redo stack
        this.redoStack.push(new ConfigurationSnapshot());

        // Pop from undo stack and restore
        const snapshot = this.undoStack.pop();
        this._restoreConfiguration(snapshot);
    }

    /**
     * Redo last undone action - restore to redo snapshot
     */
    redo() {
        if (this.redoStack.length === 0) {
            console.warn("Nothing to redo");
            return;
        }

        // Push current state to undo stack
        this.undoStack.push(new ConfigurationSnapshot());

        // Pop from redo stack and restore
        const snapshot = this.redoStack.pop();
        this._restoreConfiguration(snapshot);
    }

    /**
     * Clear all history stacks (called when entering/exiting painter mode or loading new config)
     */
    clear() {
        this.undoStack = [];
        this.redoStack = [];
    }

    /**
     * Restore configuration from a snapshot
     * @private
     * @param {ConfigurationSnapshot} snapshot - The snapshot to restore to
     */
    _restoreConfiguration(snapshot) {
        // Destroy all current modules
        const currentModuleIds = Object.keys(gModules);
        for (const moduleId of currentModuleIds) {
            gModules[moduleId].destroy();
        }

        // Restore modules from snapshot
        for (const moduleId in snapshot.modules) {
            const data = snapshot.modules[moduleId];
            const pos = new THREE.Vector3(data.x, data.y, data.z);
            
            const module = new Module(
                data.moduleType,
                data.id,
                pos,
                data.color,
                data.scale
            );

            if (data.isStatic) {
                module.markStatic();
            }
        }

        // Recalculate visualization bounds
        VisConfigData.clearBounds();
        for (const module of Object.values(gModules)) {
            VisConfigData.updateBounds(module.pos);
        }
    }
}

// Create global history instance
window.gwPainterHistory = new PainterModeHistory();
