import $ from "./vendor/jquery-3.3.1.slim.js";
import {Icon, DOMUtils, IGVMath, StringUtils} from "../node_modules/igv-utils/src/index.js";
import TrackViewportController from "./trackViewportController.js";
import RulerSweeper from "./rulerSweeper.js";
import GenomeUtils from "./genome/genome.js";

let timer
let currentViewport = undefined
const toolTipTimeout = 1e4

class RulerViewportController extends TrackViewportController {

    constructor(trackView, $viewportColumn, referenceFrame, width) {
        super(trackView, $viewportColumn, referenceFrame, width);
    }

    initializationHelper() {

        this.$viewport.get(0).dataset.rulerTrack = 'rulerTrack';

        this.rulerSweeper = new RulerSweeper(this)

        const viewport = this.$viewport.get(0)

        this.multiLocusCloseButton = DOMUtils.div({ class: 'igv-multi-locus-close-button' })
        viewport.appendChild(this.multiLocusCloseButton)
        this.multiLocusCloseButton.appendChild(Icon.createIcon("times-circle"))

        this.rulerLabel = DOMUtils.div({ class: 'igv-multi-locus-ruler-label' })
        viewport.appendChild(this.rulerLabel)

        this.addMouseHandlers()

        this.$tooltip = $('<div>', { class: 'igv-ruler-tooltip' })
        this.$tooltip.height(this.$viewport.height())

        this.$viewport.append(this.$tooltip)

        this.$tooltipContent = $('<div>')
        this.$tooltip.append(this.$tooltipContent)

        this.$tooltip.hide()

        this.dismissLocusLabel()
    }

    addMouseHandlers() {

        this.addMultiLocusLableClickHandler(this.multiLocusCloseButton)

        this.addRulerLableClickHandler(this.rulerLabel)

        if (GenomeUtils.isWholeGenomeView(this.referenceFrame.chr)) {
            this.addViewportClickHandler(this.$viewport.get(0))
        } else {
            this.removeViewportClickHandler(this.$viewport.get(0))
        }
    }

    removeMouseHandlers() {
        this.removeMultiLocusLableClickHandler(this.multiLocusCloseButton)
        this.removeRulerLableClickHandler(this.rulerLabel)
        this.removeViewportClickHandler(this.$viewport.get(0))
    }

    addMultiLocusLableClickHandler(multiLocusCloseButton) {

        this.boundMultiLocusLableClickHandler = clickHandler.bind(this)
        multiLocusCloseButton.addEventListener('click', this.boundMultiLocusLableClickHandler)

        function clickHandler(event) {
            this.browser.removeMultiLocusPanel(this.referenceFrame)
        }

    }

    removeMultiLocusLableClickHandler(multiLocusCloseButton) {
        multiLocusCloseButton.removeEventListener('click', this.boundMultiLocusLableClickHandler)
    }

    addRulerLableClickHandler(rulerLabel) {

        this.boundRulerLableClickHandler = clickHandler.bind(this)
        rulerLabel.addEventListener('click', this.boundRulerLableClickHandler)

        async function clickHandler() {

            const removals = this.browser.referenceFrameList.filter(r => this.referenceFrame !== r)
            for (let referenceFrame of removals) {
                await this.browser.removeMultiLocusPanel(referenceFrame)
            }

        }

    }

    removeRulerLableClickHandler(rulerLabel) {
        rulerLabel.removeEventListener('click', this.boundRulerLableClickHandler)
    }

    addViewportClickHandler(viewport) {

        this.boundViewportClickHandler = clickHandler.bind(this)
        viewport.addEventListener('click', this.boundViewportClickHandler)

        function clickHandler(event) {

            const index = this.browser.referenceFrameList.indexOf(this.referenceFrame)

            const { x:pixel } = DOMUtils.translateMouseCoordinates(event, this.$viewport.get(0))

            const bp = Math.round(this.referenceFrame.start + this.referenceFrame.toBP(pixel))

            const { chr } = this.browser.genome.getChromosomeCoordinate(bp)

            let searchString
            if (1 === this.browser.referenceFrameList.length) {
                searchString = chr
            } else {
                let loci = this.browser.referenceFrameList.map(({ locusSearchString }) => locusSearchString);
                loci[ index ] = chr;
                searchString = loci.join(' ');
            }

            this.browser.search(searchString);

        }

    }

    removeViewportClickHandler(viewport) {
        viewport.removeEventListener('click', this.boundViewportClickHandler)
    }

    presentLocusLabel(viewportWidth) {
        this.rulerLabel.innerHTML = this.referenceFrame.getMultiLocusLabel(viewportWidth)
        this.rulerLabel.style.display = 'block'
        this.multiLocusCloseButton.style.display = 'block'
    }

    dismissLocusLabel() {
        this.rulerLabel.style.display = 'none'
        this.multiLocusCloseButton.style.display = 'none'
    }

    mouseMove(event) {

        if (true === this.browser.cursorGuideVisible) {

            if (undefined === currentViewport) {
                currentViewport = this
                this.$tooltip.show()
            } else if (currentViewport.guid !== this.guid) {
                currentViewport.$tooltip.hide()
                this.$tooltip.show()
                currentViewport = this
            } else {
                this.$tooltip.show()
            }

            const isWholeGenome = (this.browser.isMultiLocusWholeGenomeView() || GenomeUtils.isWholeGenomeView(this.referenceFrame.chr));

            if (isWholeGenome) {
                this.$tooltip.hide();
                return;
            }

            const { x } = DOMUtils.translateMouseCoordinates(event, this.$viewport.get(0))
            const { start, bpPerPixel } = this.referenceFrame
            const bp = Math.round(0.5 + start + Math.max(0, x) * bpPerPixel)

            this.$tooltipContent.text( StringUtils.numberFormatter(bp) )

            const { width:ww } = this.$tooltipContent.get(0).getBoundingClientRect()
            const { width:w } = this.$viewport.get(0).getBoundingClientRect()

            this.$tooltip.css({ left: `${ IGVMath.clamp(x, 0, w - ww) }px` })

            // hide tooltip when movement stops
            clearTimeout(timer)
            timer = setTimeout(() => this.$tooltip.hide(),toolTipTimeout)

        }

    }

    startSpinner() {}
    stopSpinner() {}

}

export default RulerViewportController