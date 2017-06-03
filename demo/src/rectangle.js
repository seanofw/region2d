
import React from 'react';
import PropTypes from 'prop-types';

export default class Rectangle extends React.Component {
	
	static propTypes = {
		kind: PropTypes.oneOf(["union", "intersect", "subtract", "xor", "region", "exterior"]).isRequired,
		x: PropTypes.number.isRequired,
		y: PropTypes.number.isRequired,
		width: PropTypes.number.isRequired,
		height: PropTypes.number.isRequired,
		name: PropTypes.string,
		onRectChange: PropTypes.func
	}

	constructor(props) {
		super(props);

		this.state = { dragging: false, sizing: false, relX: null, relY: null };

		this.timer = null;
		this.onMouseDown = this.onMouseDown.bind(this);
		this.onMouseMove = this.onMouseMove.bind(this);
		this.onMouseUp = this.onMouseUp.bind(this);
	}

	getClassName() {
		return "rectangle " + this.props.kind;
	}

	onMouseDown(e) {
		e.preventDefault();
		if (this.props.kind === 'region' || this.props.kind === 'exterior' || !this.props.onRectChange) return;
		const clientRect = this.element.getBoundingClientRect();
		const pagePoint = { x: clientRect.left + window.scrollX, y: clientRect.top + window.scrollY };
		const clientPoint = { x: e.pageX - pagePoint.x, y: e.pageY - pagePoint.y };
		const rightDist = this.props.width - clientPoint.x;
		const bottomDist = this.props.height - clientPoint.y;
		if (Math.max(rightDist, bottomDist) <= 10) {
			this.setState({ sizing: true, relX: rightDist, relY: bottomDist });
		}
		else {
			this.setState({ dragging: true, relX: clientPoint.x, relY: clientPoint.y });
		}
		window.addEventListener("mousemove", this.onMouseMove);
		window.addEventListener("mouseup", this.onMouseUp);
	}

	onMouseMove(e) {
		e.preventDefault();
		if (!this.props.onRectChange) return;

		this.trackEvent = { pageX: e.pageX, pageY: e.pageY };
		if (this.timer)
			return;

		this.timer = setTimeout(() => {
			this.timer = null;
			if (this.state.dragging) {
				const newPageX = this.trackEvent.pageX - this.state.relX;
				const newPageY = this.trackEvent.pageY - this.state.relY;
				const parentClientRect = this.element.parentNode.getBoundingClientRect();
				const parentPagePoint = { x: parentClientRect.left + window.scrollX, y: parentClientRect.top + window.scrollY };
				let newX = Math.floor(newPageX - parentPagePoint.x + 0.5);
				let newY = Math.floor(newPageY - parentPagePoint.y + 0.5);
				if (newX < 0) newX = 0;
				if (newY < 0) newY = 0;
				if (newX > parentClientRect.width - 4 - this.props.width) newX = parentClientRect.width - 4 - this.props.width;
				if (newY > parentClientRect.height - 4 - this.props.height) newY = parentClientRect.height - 4 - this.props.height;
				if (newX != this.props.x || newY != this.props.y) {
					this.props.onRectChange(e, { kind: this.props.kind, name: this.props.name, x: newX, y: newY, width: this.props.width, height: this.props.height });
				}
			}
			else if (this.state.sizing) {
				const newPageX = this.trackEvent.pageX + this.state.relX;
				const newPageY = this.trackEvent.pageY + this.state.relY;
				const parentClientRect = this.element.parentNode.getBoundingClientRect();
				const parentPagePoint = { x: parentClientRect.left + window.scrollX, y: parentClientRect.top + window.scrollY };
				let newX = Math.floor(newPageX - parentPagePoint.x + 0.5);
				let newY = Math.floor(newPageY - parentPagePoint.y + 0.5);
				if (newX > parentClientRect.width) newX = parentClientRect.width;
				if (newY > parentClientRect.height) newY = parentClientRect.height;
				let newWidth = newX - this.props.x;
				let newHeight = newY - this.props.y;
				if (newWidth < 10) newWidth = 10;
				if (newHeight < 10) newHeight = 10;
				if (newWidth != this.props.width || newHeight != this.props.height) {
					this.props.onRectChange(e, { kind: this.props.kind, name: this.props.name, x: this.props.x, y: this.props.y, width: newWidth, height: newHeight });
				}
			}
		}, 10);
	}

	onMouseUp(e) {
		e.preventDefault();
		this.setState({ dragging: false, sizing: false });
		window.removeEventListener("mousemove", this.onMouseMove);
		window.removeEventListener("mouseup", this.onMouseUp);
	}

	render() {
		return (
			<div className={this.getClassName()}
				onMouseDown={this.onMouseDown}
				ref={e => { this.element = e; }}
				style={{
					top: this.props.y + "px",
					left: this.props.x + "px",
					width: (this.props.width - 1) + "px",
					height: (this.props.height - 1) + "px"
				}} title={this.props.kind != 'region' && this.props.kind !== 'exterior' ? `Click-and-drag to move rectangle ${this.props.name}.` : void(0)}>
				{this.props.kind != 'region' && this.props.kind !== 'exterior' ? <h4>{this.props.name}</h4> : void(0)}
				{this.props.kind != 'region' && this.props.kind !== 'exterior' ? <span className="shangle" title={`Click-and-drag to resize rectangle ${this.props.name}.`}></span> : void(0)}
			</div>
		);
	}
}
