import { compact, CompactType, LayoutItem, moveElement } from './react-grid-layout.utils';
import { KtdGridCfg, KtdGridItemRect, KtdGridLayoutItem } from './grid.definitions';
import { ktdPointerClientX, ktdPointerClientY } from './pointer.utils';
import { KtdDictionary } from '../types';

function screenXPosToGridValue(screenXPos: number, cols: number, width: number): number {
    return Math.round((screenXPos * cols) / width);
}

function screenYPosToGridValue(screenYPos: number, rowHeight: number, height: number): number {
    return Math.round(screenYPos / rowHeight);
}

export function ktdLayoutItemToGridLayoutItem(item: LayoutItem): KtdGridLayoutItem {
    return {
        id: item.i,
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h
    };
}

/** Returns a Dictionary where the key is the id and the value is the change applied to that item. If no changes Dictionary is empty. */
export function ktdGetGridLayoutDiff(gridLayoutA: KtdGridLayoutItem[], gridLayoutB: KtdGridLayoutItem[]): KtdDictionary<{change: 'move' | 'resize' | 'moveresize'}> {
    const diff: KtdDictionary<{change: 'move' | 'resize' | 'moveresize'}> = {};

    gridLayoutA.forEach(itemA => {
        const itemB = gridLayoutB.find(_itemB => _itemB.id === itemA.id);
        if (itemB != null) {
            const posChanged = itemA.x !== itemB.x || itemA.y !== itemB.y;
            const sizeChanged = itemA.w !== itemB.w || itemA.h !== itemB.h;
            const change: 'move' | 'resize' | 'moveresize' | null = posChanged && sizeChanged ? 'moveresize' : posChanged ? 'move' : sizeChanged ? 'resize' : null;
            if (change) {
                diff[itemB.id] = {change};
            }
        }
    });
    return diff;
}

/**
 * Given the grid config & layout data and the current drag position & information, returns the corresponding layout and drag item position
 * @param gridItemId id of the grid item that is been dragged
 * @param config current grid configuration
 * @param compactionType type of compaction that will be performed
 * @param draggingData contains all the information about the drag
 */
export function ktdGridItemDragging(gridItemId: string, config: KtdGridCfg, compactionType: CompactType, draggingData: { pointerDownEvent: MouseEvent | TouchEvent, pointerDragEvent: MouseEvent | TouchEvent, parentElemClientRect: ClientRect, dragElemClientRect: ClientRect }): { layout: KtdGridLayoutItem[]; draggedItemPos: KtdGridItemRect } {
    const {pointerDownEvent, pointerDragEvent, parentElemClientRect, dragElemClientRect} = draggingData;

    const draggingElemPrevItem = config.layout.find(item => item.id === gridItemId)!;

    const clientStartX = ktdPointerClientX(pointerDownEvent);
    const clientStartY = ktdPointerClientY(pointerDownEvent);
    const clientX = ktdPointerClientX(pointerDragEvent);
    const clientY = ktdPointerClientY(pointerDragEvent);

    const offsetX = clientStartX - dragElemClientRect.left;
    const offsetY = clientStartY - dragElemClientRect.top;

    const gridRelXPos = clientX - parentElemClientRect.left - offsetX;
    const gridRelYPos = clientY - parentElemClientRect.top - offsetY;

    // Get layout item position
    const layoutItem: KtdGridLayoutItem = {
        ...draggingElemPrevItem,
        x: screenXPosToGridValue(gridRelXPos, config.cols, parentElemClientRect.width),
        y: screenYPosToGridValue(gridRelYPos, config.rowHeight, parentElemClientRect.height)
    };

    // console.log({clientX, clientY, offsetX, offsetY, gridRelXPos, gridRelYPos, parentElemClientRect, layoutItem});

    // Correct the values if they overflow, since 'moveElement' function doesn't do it
    layoutItem.x = Math.max(0, layoutItem.x);
    layoutItem.y = Math.max(0, layoutItem.y);
    if (layoutItem.x + layoutItem.w > config.cols) {
        layoutItem.x = Math.max(0, config.cols - layoutItem.w);
    }

    // Parse to LayoutItem array data in order to use 'react.grid-layout' utils
    const layoutItems: LayoutItem[] = config.layout.map((item) => ({...item, i: item.id}));
    const draggedLayoutItem: LayoutItem = layoutItems.find(item => item.i === gridItemId)!;

    let newLayoutItems: LayoutItem[] = moveElement(
        layoutItems,
        draggedLayoutItem,
        layoutItem.x,
        layoutItem.y,
        true,
        false,
        compactionType,
        config.cols
    );

    newLayoutItems = compact(newLayoutItems, compactionType, config.cols);

    return {
        layout: newLayoutItems.map((item) => ktdLayoutItemToGridLayoutItem(item)),
        draggedItemPos: {
            top: gridRelYPos,
            left: gridRelXPos,
            width: dragElemClientRect.width,
            height: dragElemClientRect.height,
        }
    };
}

/**
 * Given the grid config & layout data and the current drag position & information, returns the corresponding layout and drag item position
 * @param gridItemId id of the grid item that is been dragged
 * @param config current grid configuration
 * @param compactionType type of compaction that will be performed
 * @param draggingData contains all the information about the drag
 */
export function ktdGridItemResizing(gridItemId: string, config: KtdGridCfg, compactionType: CompactType, draggingData: { pointerDownEvent: MouseEvent | TouchEvent, pointerDragEvent: MouseEvent | TouchEvent, parentElemClientRect: ClientRect, dragElemClientRect: ClientRect }): { layout: KtdGridLayoutItem[]; draggedItemPos: KtdGridItemRect } {
    const {pointerDownEvent, pointerDragEvent, parentElemClientRect, dragElemClientRect} = draggingData;

    const clientStartX = ktdPointerClientX(pointerDownEvent);
    const clientStartY = ktdPointerClientY(pointerDownEvent);
    const clientX = ktdPointerClientX(pointerDragEvent);
    const clientY = ktdPointerClientY(pointerDragEvent);

    // Get the difference between the mouseDown and the position 'right' of the resize element.
    const resizeElemOffsetX = dragElemClientRect.width - (clientStartX - dragElemClientRect.left);
    const resizeElemOffsetY = dragElemClientRect.height - (clientStartY - dragElemClientRect.top);

    const draggingElemPrevItem = config.layout.find(item => item.id === gridItemId)!;
    const width = clientX - dragElemClientRect.left + resizeElemOffsetX;
    const height = clientY - dragElemClientRect.top + resizeElemOffsetY;

    // Get layout item grid position
    const layoutItem: KtdGridLayoutItem = {
        ...draggingElemPrevItem,
        w: screenXPosToGridValue(width, config.cols, parentElemClientRect.width),
        h: screenYPosToGridValue(height, config.rowHeight, parentElemClientRect.height)
    };

    layoutItem.w = Math.max(1, layoutItem.w);
    layoutItem.h = Math.max(1, layoutItem.h);
    if (layoutItem.x + layoutItem.w > config.cols) {
        layoutItem.w = Math.max(1, config.cols - layoutItem.x);
    }

    const newLayoutItems: LayoutItem[] = config.layout.map((item) => {
        return item.id === gridItemId ? {...layoutItem, i: item.id} : {...item, i: item.id};
    });

    return {
        layout: compact(newLayoutItems, compactionType, config.cols).map((item) => ktdLayoutItemToGridLayoutItem(item)),
        draggedItemPos: {
            top: dragElemClientRect.top - parentElemClientRect.top,
            left: dragElemClientRect.left - parentElemClientRect.left,
            width,
            height,
        }
    };
}
