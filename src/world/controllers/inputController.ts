// ============================================================================
// MODULE: World / Controllers / Input Controller
// DESIGN: Keyboard, mouse, touch and pointer-lock listeners for the playing world (SRP)
// SUMMARY: Attaches the input listeners and returns a function that detaches them. The canvas passes the state and
//          actions the handlers need, so the handlers no longer live inside the canvas effect.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import type * as THREE from 'three';
import type { IPlayerState } from '../domain/worldTypes';
import type { ICameraRigState } from '../systems/cameraRigSystem';
import type { ILookInputState } from '../domain/lookInputState';
import type { IActionInputState } from '../domain/actionInputState';
import type { IHudFeedbackState } from '../domain/hudFeedbackState';
import type { GameStateMode } from '../domain/gameShellTypes';
import type { IGameSettingsConfig } from '../../config/savedGameSettings';
import type { NatureSoundEngine } from '../soundEngine';
import type { IPerfDebugTools } from './perfDebugTools';
import type { InventoryItemId, ArrowElementKind } from '../domain/worldTypes';
import type { IAnimatedWorldHandles } from '../proceduralModels';
import type { PerspectiveCamera } from 'three';
import { matchesKeyBinding } from '../../config/keyBindingMatch';
import { cancelBowDraw, equipInventoryItem, MIN_BOW_DRAW_TO_SHOOT } from '../systems/combatAndInventorySystem';
import { findLookedAtWatchtowerLadder } from '../domain/landmarks/interactionLandmarks';
// #endregion

// ======================== CONTRACTS ======================== \\
// #region Contracts
/** Summary: What the input handlers read and drive. Everything here is owned by the canvas. */
export interface IInputControllerContext {
  readonly container: HTMLElement;
  readonly renderer: THREE.WebGLRenderer;
  readonly camera: PerspectiveCamera;
  readonly worldHandles: IAnimatedWorldHandles;
  readonly playerState: IPlayerState;
  readonly lookState: ILookInputState;
  readonly actionState: IActionInputState;
  readonly hudFeedback: IHudFeedbackState;
  readonly keysPressed: Set<string>;
  readonly keysJustPressed: Set<string>;
  readonly cameraRig: ICameraRigState;
  readonly soundEngine: NatureSoundEngine;
  readonly perfDebug: IPerfDebugTools;
  readonly gameSettingsRef: { current: IGameSettingsConfig };
  readonly gameStateRef: { current: GameStateMode };
  readonly onRequestPauseToggleRef: { current: () => void };
  readonly deployTrapFromInventory: (specificTrapItem?: InventoryItemId, forceHoldInHands?: boolean) => void;
  readonly emitHudSnapshot: () => void;
  readonly executeSwordSlash: (isHeavy?: boolean, deferHitToStrikeWindow?: boolean) => void;
  readonly fireArrowNow: (powerOverride?: number) => void;
  readonly placeHeldTrapAtPreview: () => boolean;
  readonly requestPointerLockSafely: () => void;
  readonly handleReacquirePointerLock: () => void;
}
// #endregion

// ======================== ATTACH ======================== \\
// #region Attach
/**
 * Summary: Attaches every input listener of the world and returns the function that removes them.
 */
export function attachInputListeners(ctx: IInputControllerContext): () => void {
  const {
    container,
    renderer,
    camera,
    worldHandles,
    playerState,
    lookState,
    actionState,
    hudFeedback,
    keysPressed,
    keysJustPressed,
    cameraRig,
    soundEngine,
    perfDebug,
    gameSettingsRef,
    gameStateRef,
    onRequestPauseToggleRef,
    deployTrapFromInventory,
    emitHudSnapshot,
    executeSwordSlash,
    fireArrowNow,
    placeHeldTrapAtPreview,
    requestPointerLockSafely,
    handleReacquirePointerLock,
  } = ctx;

    // Event Listeners
    const onKeyDown = (e: KeyboardEvent) => {
      const kb = gameSettingsRef.current.keybindings;
      // Escape always pauses as a universal fallback, next to the configurable pause key (unless an inventory/chest/market/map modal is open).
      if (matchesKeyBinding(e.code, kb.pauseGame) || e.code === 'Escape') {
        if (
          document.body.dataset.skyrimModalOpen !== 'true' &&
          document.body.dataset.worldMapModalOpen !== 'true' &&
          (gameStateRef.current === 'playing' || gameStateRef.current === 'paused')
        ) {
          onRequestPauseToggleRef.current();
        }
      }
      // While Ctrl is held (e.g. sneaking), stop Ctrl+<movement key> from firing browser shortcuts.
      if (gameStateRef.current === 'playing' && e.ctrlKey) {
        const movementKeys = [kb.moveForward, kb.moveBackward, kb.moveLeft, kb.moveRight, kb.jump];
        if (movementKeys.some((bound) => matchesKeyBinding(e.code, bound))) {
          e.preventDefault();
        }
      }
      // If Skyrim Inventory [Tab], Favorites [Q], or Full-Screen Map [M] modal is open, let the modal handle keys!
      if (
        document.body.dataset.skyrimModalOpen === 'true' ||
        document.body.dataset.worldMapModalOpen === 'true'
      ) {
        return;
      }

      // Toggle Camera Perspective between 3rd-Person Character View and 1st-Person View
      if (e.code === kb.cameraPerspective && !e.repeat && gameStateRef.current === 'playing') {
        playerState.cameraPerspective =
          playerState.cameraPerspective === 'third_person' ? 'first_person' : 'third_person';
      }
      // Deploy Animal Trap on [T] key
      if (e.code === 'KeyT' && !e.repeat && gameStateRef.current === 'playing') {
        deployTrapFromInventory();
      }
      // Toggle Visual Collider Wireframes Debug Mode on F3
      if (e.code === 'F3' && !e.repeat) {
        e.preventDefault();
        worldHandles.colliderDebugHandles.toggle();
        emitHudSnapshot();
      }
      // Performance overlay on F4
      if (e.code === 'F4' && !e.repeat) {
        e.preventDefault();
        perfDebug.toggleOverlay();
      }
      // Customizable Hotkey Slots [1], [2], [3], [4]
      if (
        (e.code === kb.hotbarSlot1 ||
          e.code === kb.hotbarSlot2 ||
          e.code === kb.hotbarSlot3 ||
          e.code === kb.hotbarSlot4) &&
        !e.repeat &&
        gameStateRef.current === 'playing'
      ) {
        const slotIdx =
          e.code === kb.hotbarSlot1
            ? 0
            : e.code === kb.hotbarSlot2
              ? 1
              : e.code === kb.hotbarSlot3
                ? 2
                : 3;
        const boundItem = playerState.hotbarSlots?.[slotIdx];
        if (boundItem) {
          if (boundItem.startsWith('trap_')) {
            deployTrapFromInventory(boundItem);
          } else {
            playerState.heldTrapItemId = null;
            equipInventoryItem(playerState, boundItem);
            soundEngine.playFootstep('trail', 1.15);
            emitHudSnapshot();
          }
        }
      }
      // Cycle Arrow Element: Normal Steel -> Fire Arrow -> Wind Storm Arrow
      if (e.code === kb.cycleArrowElement && !e.repeat && gameStateRef.current === 'playing') {
        const order: ArrowElementKind[] = ['normal', 'fire', 'wind'];
        const curr = playerState.arrowKind ?? 'normal';
        playerState.arrowKind = order[(order.indexOf(curr) + 1) % order.length];
        soundEngine.playBowDraw();
      }
      // Ranger Dash / Water Surge
      if (e.code === kb.dash && !e.repeat && gameStateRef.current === 'playing') {
        if ((playerState.dashCooldown ?? 0) <= 0.05) {
          playerState.dashTimer = 0.42;
          playerState.dashCooldown = 1.4;
          soundEngine.playFootstep(playerState.isSwimming ? 'water' : playerState.currentBiome, 1.25);
        }
      }
      // Put away held trap with [R] key
      if (
        e.code === 'KeyR' &&
        !e.repeat &&
        gameStateRef.current === 'playing' &&
        playerState.heldTrapItemId
      ) {
        e.preventDefault();
        playerState.heldTrapItemId = null;
        hudFeedback.lootNotification = 'Put trap away.';
        hudFeedback.lootNotificationTimer = 2.0;
        soundEngine.playFootstep('trail', 0.88);
        emitHudSnapshot();
        return;
      }
      // Cancel bow draw with [R] key (or trigger sword attack when holding a sword)
      if (
        (e.code === 'KeyR' || e.code === kb.drawOrSlash) &&
        !e.repeat &&
        gameStateRef.current === 'playing' &&
        !playerState.isSwimming
      ) {
        if (playerState.equippedTool === 'sword' && e.code === kb.drawOrSlash) {
          actionState.isSwordAttackHeld = true;
          actionState.swordHoldDuration = 0;
          actionState.swordHeavyTriggeredDuringHold = false;
        } else if (cancelBowDraw(playerState)) {
          e.preventDefault();
          actionState.isMouseBowHeld = false;
          lookState.mouseMovedWhileDown = false;
          cameraRig.smoothAimZoom = 0;
          soundEngine.playFootstep('trail', 0.85);
          emitHudSnapshot();
          return;
        }
      }
      // Detect Double-Tap Jump Key (within 500ms) to toggle Flight Mode in God Mode (disabled when mounting/dismounting a ladder!)
      if (
        e.code === kb.jump &&
        !e.repeat &&
        gameStateRef.current === 'playing' &&
        gameSettingsRef.current.godMode !== false
      ) {
        const onOrLookingAtLadder =
          Boolean(playerState.climbingLadderId) ||
          Boolean(
            findLookedAtWatchtowerLadder(
              playerState.x,
              playerState.y,
              playerState.z,
              playerState.yaw,
              playerState.pitch
            )
          );
        if (!onOrLookingAtLadder) {
          const nowMs = performance.now();
          if (nowMs - actionState.lastSpaceDownMs <= 500) {
            actionState.pendingFlyToggle = true;
            actionState.lastSpaceDownMs = -1000;
          } else {
            actionState.lastSpaceDownMs = nowMs;
          }
        }
      }
      if (!keysPressed.has(e.code)) {
        keysJustPressed.add(e.code);
      }
      keysPressed.add(e.code);
      if (gameStateRef.current === 'playing') {
        soundEngine.init();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysPressed.delete(e.code);
      const kb = gameSettingsRef.current.keybindings;
      if (e.code === kb.drawOrSlash && gameStateRef.current === 'playing') {
        if (actionState.isSwordAttackHeld) {
          actionState.isSwordAttackHeld = false;
          playerState.swordChargeTime = 0;
          if (!actionState.swordHeavyTriggeredDuringHold) {
            executeSwordSlash(false);
          }
        }
      }
    };

    const onBlurOrHide = () => {
      keysPressed.clear();
      keysJustPressed.clear();
      lookState.isDraggingLook = false;
      actionState.isMouseBowHeld = false;
      actionState.isSwordAttackHeld = false;
      playerState.bowZoomHeld = false;
    };

    const onPointerLockChange = () => {
      if (!document.pointerLockElement) {
        actionState.lastPointerLockExitTimeMs = performance.now();
      }
    };

    renderer.domElement.tabIndex = -1;
    window.addEventListener('reacquire-pointer-lock', handleReacquirePointerLock);

    const onContextMenu = (e: MouseEvent) => {
      if (gameStateRef.current === 'playing') {
        e.preventDefault();
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      if (gameStateRef.current !== 'playing') return;
      soundEngine.init();
      lookState.lastPointerX = e.clientX;
      lookState.lastPointerY = e.clientY;
      lookState.mouseDownStartX = e.clientX;
      lookState.mouseDownStartY = e.clientY;
      lookState.mouseMovedWhileDown = false;

      if (
        document.body.dataset.skyrimModalOpen === 'true' ||
        document.body.dataset.worldMapModalOpen === 'true'
      ) {
        return;
      }

      // When holding a trap in hands: Left-Click places it immediately (and keeps holding if more remain), Right-Click puts it away
      if (playerState.heldTrapItemId) {
        if (e.button === 0) {
          lookState.isDraggingLook = true;
          placeHeldTrapAtPreview();
          if (
            document.pointerLockElement !== renderer.domElement &&
            performance.now() - actionState.lastPointerLockExitTimeMs > 1500
          ) {
            try {
              const lockPromise = renderer.domElement.requestPointerLock?.() as
                | Promise<void>
                | undefined;
              if (lockPromise && typeof lockPromise.catch === 'function') {
                lockPromise.catch(() => {});
              }
            } catch {
              // ignore
            }
          }
          return;
        } else if (e.button === 2) {
          playerState.heldTrapItemId = null;
          hudFeedback.lootNotification = 'Put trap away.';
          hudFeedback.lootNotificationTimer = 2.0;
          soundEngine.playFootstep('trail', 0.88);
          emitHudSnapshot();
          return;
        }
      }

      if (e.button === 2 && !playerState.isSwimming) {
        if (playerState.equippedTool === 'sword') {
          // Right mouse button with Sword equipped raises Skyrim Horizontal Parry / Block Guard!
          playerState.swordBlocking = true;
          soundEngine.playSwordClash(true);
        } else if (!playerState.staminaExhausted) {
          // Right mouse button in Bow mode ONLY zooms the screen in closer (while stamina is not exhausted)!
          playerState.bowZoomHeld = true;
        }
      } else if (e.button === 0) {
        lookState.isDraggingLook = true;
        if (!playerState.isSwimming && playerState.equippedTool === 'sword') {
          // Left mouse button with Sword: tap for quick horizontal cleave, hold >= 0.24s for Heavy Forward Air-Cleaving Power Attack!
          actionState.isSwordAttackHeld = true;
          actionState.swordHoldDuration = 0;
          actionState.swordHeavyTriggeredDuringHold = false;
        } else if (
          !playerState.isSwimming &&
          (playerState.equippedTool ?? 'bow') === 'bow'
        ) {
          const ownsAnyBow = playerState.ownedItemIds
            ? playerState.ownedItemIds.some(
                (id) => id === 'bow' || id === 'elven_longbow' || id === 'dragonbone_bow'
              )
            : true;
          if (ownsAnyBow) {
            // Left mouse button in Bow mode draws the bow and arrow!
            actionState.isMouseBowHeld = true;
            if (!playerState.bowDrawn) {
              playerState.bowDrawn = true;
              soundEngine.playBowDraw();
            }
          }
        }
        if (
          document.pointerLockElement !== renderer.domElement &&
          performance.now() - actionState.lastPointerLockExitTimeMs > 1500
        ) {
          try {
            const lockPromise = renderer.domElement.requestPointerLock?.() as
              | Promise<void>
              | undefined;
            if (lockPromise && typeof lockPromise.catch === 'function') {
              lockPromise.catch(() => {
                // Ignore browser SecurityError cooldown when user recently exited pointer lock
              });
            }
          } catch {
            // Ignore synchronous PointerLock rejection if unsupported or blocked
          }
        }
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (gameStateRef.current !== 'playing') return;
      const sens = gameSettingsRef.current.mouseSensitivity ?? 1.0;
      if (document.pointerLockElement === renderer.domElement) {
        lookState.accumYawDelta -= e.movementX * 0.0022 * sens;
        lookState.accumPitchDelta -= e.movementY * 0.0022 * sens;
      } else if (lookState.isDraggingLook) {
        const dx = e.clientX - lookState.lastPointerX;
        const dy = e.clientY - lookState.lastPointerY;
        lookState.lastPointerX = e.clientX;
        lookState.lastPointerY = e.clientY;
        lookState.accumYawDelta -= dx * 0.0045 * sens;
        lookState.accumPitchDelta -= dy * 0.0045 * sens;
        if (Math.hypot(e.clientX - lookState.mouseDownStartX, e.clientY - lookState.mouseDownStartY) > 16) {
          lookState.mouseMovedWhileDown = true;
        }
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      lookState.isDraggingLook = false;
      if (e.button === 2) {
        if (playerState.swordBlocking) {
          playerState.swordBlocking = false;
        }
        if (playerState.bowZoomHeld) {
          playerState.bowZoomHeld = false;
        }
      }
      if (e.button === 0 && actionState.isSwordAttackHeld) {
        actionState.isSwordAttackHeld = false;
        playerState.swordChargeTime = 0;
        if (!actionState.swordHeavyTriggeredDuringHold && !lookState.mouseMovedWhileDown) {
          executeSwordSlash(false);
        }
      }
      if (e.button === 0 && actionState.isMouseBowHeld) {
        actionState.isMouseBowHeld = false;
        const isLocked = document.pointerLockElement === renderer.domElement;
        if (
          playerState.bowDrawn &&
          (playerState.bowDrawProgress ?? 0) >= MIN_BOW_DRAW_TO_SHOOT &&
          (isLocked || !lookState.mouseMovedWhileDown || playerState.bowDrawProgress >= 0.35)
        ) {
          fireArrowNow();
        } else {
          playerState.bowDrawn = false;
          playerState.bowDrawProgress = 0;
        }
      }
    };

    // Touch look support on mobile
    const onTouchStart = (e: TouchEvent) => {
      if (gameStateRef.current !== 'playing') return;
      soundEngine.init();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (lookState.touchLookId === null) {
          lookState.touchLookId = t.identifier;
          lookState.lastTouchX = t.clientX;
          lookState.lastTouchY = t.clientY;
        }
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (gameStateRef.current !== 'playing' || lookState.touchLookId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === lookState.touchLookId) {
          const dx = t.clientX - lookState.lastTouchX;
          const dy = t.clientY - lookState.lastTouchY;
          lookState.lastTouchX = t.clientX;
          lookState.lastTouchY = t.clientY;
          lookState.accumYawDelta -= dx * 0.005;
          lookState.accumPitchDelta -= dy * 0.005;
        }
      }
    };
    const onTouchEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === lookState.touchLookId) {
          lookState.touchLookId = null;
        }
      }
    };

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    document.addEventListener('pointerlockchange', onPointerLockChange);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlurOrHide);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('resize', onResize);
    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('touchstart', onTouchStart, { passive: true });
    renderer.domElement.addEventListener('touchmove', onTouchMove, { passive: true });
    renderer.domElement.addEventListener('touchend', onTouchEnd, { passive: true });
    renderer.domElement.addEventListener('touchcancel', onTouchEnd, { passive: true });


  return () => {
    document.removeEventListener('pointerlockchange', onPointerLockChange);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', onBlurOrHide);
    window.removeEventListener('mouseup', onMouseUp);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('mousemove', onMouseMove);
    renderer.domElement.removeEventListener('mousedown', onMouseDown);
    renderer.domElement.removeEventListener('contextmenu', onContextMenu);
    renderer.domElement.removeEventListener('touchstart', onTouchStart);
    renderer.domElement.removeEventListener('touchmove', onTouchMove);
    renderer.domElement.removeEventListener('touchend', onTouchEnd);
    renderer.domElement.removeEventListener('touchcancel', onTouchEnd);
    window.removeEventListener('reacquire-pointer-lock', handleReacquirePointerLock);
  };
}
// #endregion
