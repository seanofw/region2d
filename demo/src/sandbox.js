
import React from 'react';
import PropTypes from 'prop-types';

import Rectangle from './rectangle';
import Edge from './edge';
import Region2D from '../../src/region2d';

export default class Sandbox extends React.Component {
	
	static propTypes = {
		rects: PropTypes.arrayOf(PropTypes.object),
		onRectChange: PropTypes.func
	}

	constructor(props) {
		super(props);

		this.state = { showPath: true, showRects: true, showInterior: false, showExterior: false };
	}

	makeRegion() {
		const rects = this.props.rects;

		if (!rects.length) return Region2D.empty;

		let region = new Region2D(rects[0]);
		for (let i = 1, l = rects.length; i < l; i++) {
			switch (rects[i].kind) {
				case 'union':
					region = region.union(new Region2D(rects[i]));
					break;
				case 'intersect':
					region = region.intersect(new Region2D(rects[i]));
					break;
				case 'subtract':
					region = region.subtract(new Region2D(rects[i]));
					break;
				case 'xor':
					region = region.xor(new Region2D(rects[i]));
					break;
			}
		}

		return region;
	}

	onRectChange(e, index, rect) {
		if (this.props.onRectChange) {
			this.props.onRectChange(index, rect);
		}
	}

	pathToEdges(path) {
		const edges = [];
		for (let winding of path) {
			let prevX = winding[winding.length - 1].x;
			let prevY = winding[winding.length - 1].y;
			for (let i = 0, l = winding.length; i < l; i++) {
				const x = winding[i].x;
				const y = winding[i].y;
				edges.push({ x1: prevX, y1: prevY, x2: x, y2: y });
				prevX = x;
				prevY = y;
			}
		}
		return edges;
	}

	render() {
		const region = this.makeRegion();
		const path = region.getPath();
		const edges = this.pathToEdges(path);
		const interiorRects = region.getRects();
		const exterior = (new Region2D([0, 0, 800, 600])).subtract(region);
		const exteriorRects = exterior.getRects();

		return (
			<section className="sandbox">
				<h3>Sandbox Playground</h3>
				<div className="options">
					<label><input type="checkbox" checked={this.state.showPath} onChange={e=>this.setState({showPath:e.target.checked})} /> Show path</label> &nbsp;
					<label><input type="checkbox" checked={this.state.showRects} onChange={e=>this.setState({showRects:e.target.checked})} /> Show rects</label> &nbsp;
					<label><input type="checkbox" checked={this.state.showInterior} onChange={e=>this.setState({showInterior:e.target.checked})} /> Show interior</label> &nbsp;
					<label><input type="checkbox" checked={this.state.showExterior} onChange={e=>this.setState({showExterior:e.target.checked})} /> Show exterior</label>
				</div>
				<div className="content">
					{this.state.showExterior ? exteriorRects.map((rect, index) =>
						<Rectangle key={index + 2000000} kind="exterior" name="" x={rect.x} y={rect.y} width={rect.width} height={rect.height} />) : void(0)}
					{this.state.showInterior ? interiorRects.map((rect, index) =>
						<Rectangle key={index + 1000000} kind="region" name="" x={rect.x} y={rect.y} width={rect.width} height={rect.height} />) : void(0)}
					{this.state.showRects ? this.props.rects.map((rect, index) =>
						<Rectangle key={index} kind={rect.kind} name={rect.name} x={rect.x} y={rect.y} width={rect.width} height={rect.height} onRectChange={(e, r) => this.onRectChange(e, index, r)} />) : void(0)}
					{this.state.showPath ? edges.map((edge, index) =>
						<Edge key={index} x1={edge.x1} x2={edge.x2} y1={edge.y1} y2={edge.y2} />) : void(0)}
				</div>
			</section>
		);
	}
}
