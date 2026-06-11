// Copyright Epic Games, Inc. All Rights Reserved.
import { StreamMessageController } from '../UeInstanceMessage/StreamMessageController';
import { InputCoordTranslator } from '../Util/InputCoordTranslator';
import { VideoPlayer } from '../VideoPlayer/VideoPlayer';
import type { ActiveKeys } from './InputClassesFactory';
import { MouseController } from './MouseController';
import { Config, Flags } from '../Config/Config';

/**
 * A mouse controller that allows the mouse to freely float over the video document.
 */
export class MouseControllerHovering extends MouseController {
    videoElementParent: HTMLDivElement;

    onPointerUpListener: (event: PointerEvent) => void;
    onPointerDownListener: (event: PointerEvent) => void;
    onMouseDblClickListener: (event: MouseEvent) => void;
    onMouseWheelListener: (event: WheelEvent) => void;
    onPointerMoveListener: (event: PointerEvent) => void;
    onContextMenuListener: (event: MouseEvent) => void;

    constructor(
        streamMessageController: StreamMessageController,
        videoPlayer: VideoPlayer,
        coordinateConverter: InputCoordTranslator,
        activeKeys: ActiveKeys,
        config: Config
    ) {
        super(streamMessageController, videoPlayer, coordinateConverter, activeKeys, config);
        this.videoElementParent = videoPlayer.getVideoParentElement() as HTMLDivElement;
        this.onPointerUpListener = this.onPointerUp.bind(this);
        this.onPointerDownListener = this.onPointerDown.bind(this);
        this.onMouseDblClickListener = this.onMouseDblClick.bind(this);
        this.onMouseWheelListener = this.onMouseWheel.bind(this);
        this.onPointerMoveListener = this.onPointerMove.bind(this);
        this.onContextMenuListener = this.onContextMenu.bind(this);
    }

    override register(): void {
        super.register();

        this.videoElementParent.addEventListener('pointerdown', this.onPointerDownListener);
        this.videoElementParent.addEventListener('pointermove', this.onPointerMoveListener, {
            passive: true
        });
        this.videoElementParent.addEventListener('pointerup', this.onPointerUpListener);
        this.videoElementParent.addEventListener('pointercancel', this.onPointerUpListener);
        this.videoElementParent.addEventListener('contextmenu', this.onContextMenuListener);
        this.videoElementParent.addEventListener('wheel', this.onMouseWheelListener, { passive: true });
        this.videoElementParent.addEventListener('dblclick', this.onMouseDblClickListener);
    }

    override unregister(): void {
        this.videoElementParent.removeEventListener('pointerdown', this.onPointerDownListener);
        this.videoElementParent.removeEventListener('pointermove', this.onPointerMoveListener);
        this.videoElementParent.removeEventListener('pointerup', this.onPointerUpListener);
        this.videoElementParent.removeEventListener('pointercancel', this.onPointerUpListener);
        this.videoElementParent.removeEventListener('contextmenu', this.onContextMenuListener);
        this.videoElementParent.removeEventListener('wheel', this.onMouseWheelListener);
        this.videoElementParent.removeEventListener('dblclick', this.onMouseDblClickListener);
        super.unregister();
    }

    private onPointerDown(event: PointerEvent) {
        if (event.pointerType === 'touch' || !this.videoPlayer.isVideoReady()) {
            return;
        }
        event.preventDefault();

        this.videoElementParent.setPointerCapture(event.pointerId);

        const coord = this.coordinateConverter.translateUnsigned(event.offsetX, event.offsetY);
        this.streamMessageController.toStreamerHandlers.get('MouseDown')([event.button, coord.x, coord.y]);
    }

    private onPointerUp(event: PointerEvent) {
        if (event.pointerType === 'touch' || !this.videoPlayer.isVideoReady()) {
            return;
        }
        event.preventDefault();

        const coord = this.coordinateConverter.translateUnsigned(event.offsetX, event.offsetY);
        this.streamMessageController.toStreamerHandlers.get('MouseUp')([event.button, coord.x, coord.y]);
    }

    private onContextMenu(event: MouseEvent) {
        if (!this.videoPlayer.isVideoReady()) {
            return;
        }
        event.preventDefault();
    }

    private onPointerMove(event: PointerEvent) {
        if (event.pointerType === 'touch' || !this.videoPlayer.isVideoReady()) {
            return;
        }
        const coord = this.coordinateConverter.translateUnsigned(event.offsetX, event.offsetY);
        const delta = this.coordinateConverter.translateSigned(event.movementX, event.movementY);
        this.streamMessageController.toStreamerHandlers.get('MouseMove')([
            coord.x,
            coord.y,
            delta.x,
            delta.y
        ]);
        event.preventDefault();
    }

    private onMouseWheel(event: WheelEvent) {
        if (!this.videoPlayer.isVideoReady()) {
            return;
        }
        const coord = this.coordinateConverter.translateUnsigned(event.offsetX, event.offsetY);
        this.streamMessageController.toStreamerHandlers.get('MouseWheel')([
            event.wheelDelta,
            coord.x,
            coord.y
        ]);
        event.preventDefault();
    }

    private onMouseDblClick(event: MouseEvent) {
        if (!this.videoPlayer.isVideoReady()) {
            return;
        }
        const coord = this.coordinateConverter.translateUnsigned(event.offsetX, event.offsetY);
        this.streamMessageController.toStreamerHandlers.get('MouseDouble')([event.button, coord.x, coord.y]);

        // UE's MouseDouble is press-only — no matching release is synthesized.
        // Without this the engine thinks the button is still held after a double-click.
        if (this.config.isFlagEnabled(Flags.MouseDoubleClickAutoRelease)) {
            this.streamMessageController.toStreamerHandlers.get('MouseUp')([event.button, coord.x, coord.y]);
        }
    }
}
