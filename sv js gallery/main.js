;(function() {

	class gallery {
		// the default options. Can be overridden by the provided "params" to the constructor
		#defaultOptions = {
			title: null,
			images: [],
		}

		// slider options - combined, default and provided by the user
		#options = {};

		// the slider element
		#galleryEl = null;
		#mainImageWrapper = null; // the wrapping <div> of the main <img> (or <video>)
		#mainImageEl = null;
		#mainVideoEl = null;
		#rightButtonEl = null;
		#leftButtonEl = null;
		#closeButtonEl = null;

		#currentImageIndex = 0;

		#galleryHtml = `
		<div id="gallery-slider" class="prevent-select">
			<div id="gallery-main-image"></div>
			<div id="gallery-thumbnails"></div>
		</div>`.replace(/\s+</g, '<'); // remove whitespaces

		constructor(options) {
			// build the object options
			this.#options = {...this.#defaultOptions, ...options};
		}

		// show the slider
		show() {
			// check that images are defined
			if (this.#options.images.length === 0) {
				console.warn("gallery: images are not provided");
				return;

			// allow gallery only for images. For videos, only one item is allowed
			} else if (this.#options.images.length > 1 && 
				this.#options.images.some(imgObj => this.#isVideo(imgObj))) {
				console.error("gallery gallery does not support gallery for video files")
				return;
			}

			this.#initgalleryEl();
			this.#initMainImage();
			this.#initThumbnails();
			this.#initControls();

			this.#setMainImage(this.#currentImageIndex);

			this.#bindEvents();
		}

		#isVideo(imageObj) {
			return (typeof(imageObj.type) == 'string' && imageObj.type.toLowerCase() == 'video') ||
				imageObj.src.match(/\.(mp4|wmv|mpg|mpeg)$/g);
		}

		hide() {
			this.#unbindEvents();

			this.#galleryEl.remove();
		}


		// get/create the gallery element
		#initgalleryEl() {
			// clear the previous slider if exists
			if (this.#galleryEl) {
				this.#galleryEl.remove();
				this.#galleryEl = null;
			}

			// use wrapper to create the new slider element.
			const galleryWrapper = document.createElement('div');
			galleryWrapper.innerHTML = this.#galleryHtml;
			this.#galleryEl = galleryWrapper.firstChild;
			this.#galleryEl.parentNode.removeChild(this.#galleryEl);
			galleryWrapper.remove();

			if (this.#options.images.length <= 1) {
				this.#galleryEl.classList.add('gallery-single-image');
			}

			document.body.appendChild(this.#galleryEl);
		}

		// fill the main image
		#initMainImage() {
			this.#mainImageWrapper = document.createElement('div');
			this.#mainImageWrapper.id = 'gallery-main-image-wrapper';

			this.#mainImageEl = document.createElement('img');

			this.#galleryEl.querySelector('#gallery-main-image').appendChild(this.#mainImageWrapper);
		}

		// fill the thumbnails section
		#initThumbnails() {
			if (this.#options.images.length <= 1) {
				return;
			}

			const that = this;
			this.#options.images.forEach((img, idx) => {
				const tagName = typeof(img.type) == "string" && img.type.toLowerCase() == 'video' ? 'video' : 'img';
				let imgEl =  document.createElement(tagName);
				imgEl.src = img.thumb || img.src;
				if (img.caption) {
					imgEl.setAttribute('alt', img.caption);
					imgEl.setAttribute('title', img.caption);
				}

				let wrapperEl = document.createElement('div');
				wrapperEl.classList.add('gallery-thumb-wrapper');
				wrapperEl.setAttribute('thumb-index', idx);
				if (idx == 0) {
					wrapperEl.classList.add('gallery-thumb-wrapper-active');
				}
				wrapperEl.appendChild(imgEl);
				wrapperEl.onclick = e => {
					this.#setMainImage(idx);
				}

				that.#galleryEl.querySelector('#gallery-thumbnails').appendChild(wrapperEl);
			});
		}

		// update the <img> or <video> element
		#setMainImageEl() {
			// check if the element is image or video
			const currentImageObj = this.#options.images[this.#currentImageIndex];
			const isVideo = (typeof(currentImageObj.type) == 'string' && currentImageObj.type.toLowerCase() == 'video') ||
				currentImageObj.src.match(/\.(mp4|wmv|mpg|mpeg)$/g);
			
			// clear the current element
			if (this.#mainImageWrapper.firstChild) {
				this.#mainImageWrapper.removeChild(this.#mainImageWrapper.firstChild);
			}

			// create the main image or video
			let mainEl;
			if (isVideo) {
				this.#mainVideoEl = document.createElement('video');
				this.#mainVideoEl.autoplay = true;
				this.#mainVideoEl.muted = true;
				this.#mainVideoEl.loop = true;
				this.#mainVideoEl.load();
				this.#mainVideoEl.play();
				mainEl = this.#mainVideoEl;
			} else {
				this.#mainVideoEl = document.createElement('img');
				mainEl = this.#mainImageEl;
			}

			mainEl.setAttribute('alt', this.#options.title + ' | ' + (currentImageObj.caption || ""));
			mainEl.setAttribute('title', this.#options.title + ' | ' + (currentImageObj.caption || ""));
			mainEl.src = currentImageObj.src;

			// set the dimensions
			setTimeout(() => {
				const wrapperWidth = this.#mainImageWrapper.clientWidth;
				const wrapperHeight = this.#mainImageWrapper.clientHeight;
				const wrapperRatio = (1.0 * wrapperWidth) / wrapperHeight;

				const mediaRatio = (1.0 * currentImageObj.width) / currentImageObj.height;

				if (wrapperRatio > mediaRatio) {
					mainEl.style.height = wrapperHeight + 'px';
					mainEl.style.width = 'auto';
				} else {
					mainEl.style.width = wrapperWidth + 'px';
					mainEl.style.height = 'auto';
				}
			});
			this.#mainImageWrapper.appendChild(mainEl);
		}

		// set the image and process all the events: mark thumb, hide arrows if needed.
		#setMainImage(idx) {
			// check if out of range
			if (idx >= this.#options.images.length || idx < 0) {
				return;
			}

			this.#currentImageIndex = idx;

			// update the <img> or <video> element
			this.#setMainImageEl()

			this.#setActiveThumbnail();

			this.#updateControlsVisibility();
		}

		#setActiveThumbnail() {
			if (this.#options.images.length <= 1) {
				return;
			}

			const idx = this.#currentImageIndex;

			// remove current active thumb
			[].forEach.call(this.#galleryEl.querySelectorAll('.gallery-thumb-wrapper-active'), el => {
				el.classList.remove('gallery-thumb-wrapper-active');
			});

			const thumbs = this.#galleryEl.querySelector('#gallery-thumbnails').childNodes;
			thumbs[idx].classList.add('gallery-thumb-wrapper-active');
		}

		// init the "right", "left" and "close" buttons
		#initControls() {
			const mainImageSection = this.#galleryEl.querySelector('#gallery-main-image');

			// the areas
			const moveLeftSection = document.createElement('div');
			moveLeftSection.classList.add('gallery-move-section');
			moveLeftSection.classList.add('gallery-move-section-left');
			const moveRightSection = document.createElement('div');
			moveRightSection.classList.add('gallery-move-section');
			moveRightSection.classList.add('gallery-move-section-right');

			// the arrows
			this.#leftButtonEl = document.createElement('div');
			this.#leftButtonEl.classList.add('gallery-move-arrow');
			this.#leftButtonEl.classList.add('gallery-move-arrow-left');
			this.#leftButtonEl.title = "Previous";
			this.#rightButtonEl = document.createElement('div');
			this.#rightButtonEl.classList.add('gallery-move-arrow');
			this.#rightButtonEl.classList.add('gallery-move-arrow-right');
			this.#rightButtonEl.title = "Next";

			// the close button
			this.#closeButtonEl = document.createElement('div');
			this.#closeButtonEl.classList.add('gallery-close-button');
			this.#closeButtonEl.title = "Close";

			// add the elements to the panels
			moveLeftSection.appendChild(this.#leftButtonEl);
			moveRightSection.appendChild(this.#rightButtonEl);
			moveRightSection.appendChild(this.#closeButtonEl);

			// add sections to the main image section
			mainImageSection.appendChild(moveLeftSection);
			mainImageSection.appendChild(moveRightSection);
		}

		// hide right on last image, or left on forst image
		#updateControlsVisibility() {
			// disable "next" on last item
			this.#galleryEl.querySelector('.gallery-move-arrow-right').style.display = 
				(this.#currentImageIndex >= this.#options.images.length - 1 || 
					this.#options.images.length <= 1) ? 'none' : 'initial';
			this.#galleryEl.querySelector('.gallery-move-section-left').style.visibility = 
				(this.#currentImageIndex <= 0) ? 'hidden' : 'visible';
		}

		// bind keyboard press and buttons' click
		#bindEvents() {
			this.#rightButtonEl.parentNode.onclick = e => {
				if (e.target == this.#closeButtonEl) {
					this.hide();
					return;
				}

				this.#setMainImage(this.#currentImageIndex + 1);
			};
			this.#leftButtonEl.parentNode.onclick = e => {
				this.#setMainImage(this.#currentImageIndex - 1);
			};

			this.#galleryEl.querySelector('#gallery-main-image-wrapper').onclick = e => {
				if (e.target == this.#galleryEl.querySelector('#gallery-main-image-wrapper')) {
					this.hide();
				}
			}

			window.__gallery_keydown_callback = e => {
				if (e.key === 'Escape') {
					this.hide();
				}

				if (e.key === 'ArrowRight') {
					this.#setMainImage(this.#currentImageIndex + 1);
				}

				if (e.key === 'ArrowLeft') {
					this.#setMainImage(this.#currentImageIndex - 1);
				}
			}

			window.addEventListener('keydown', window.__gallery_keydown_callback, false);
		}

		#unbindEvents() {
			window.removeEventListener('keydown', window.__gallery_keydown_callback);
		}
	}

	window.gallery = gallery;

}());
