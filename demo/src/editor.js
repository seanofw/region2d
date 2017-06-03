
import React from 'react';
import PropTypes from 'prop-types';

export default class Editor extends React.Component {
	
	static propTypes = {
		rects: PropTypes.arrayOf(PropTypes.object),
		onRectChange: PropTypes.func
	}

	constructor(props) {
		super(props);
	}

	onRectKindChange(e, rect, index) {
		if (this.props.onRectChange) {
			this.props.onRectChange(index, {
				kind: e.target.value, name: rect.name,
				x: rect.x, y: rect.y, width: rect.width, height: rect.height
			});
		}
	}

	onRectUp(e, rect, index) {
		e.preventDefault();
		if (index === 0) return;
		if (this.props.onRectChange) {
			const other = this.props.rects[index - 1];
			this.props.onRectChange(index, other);
			this.props.onRectChange(index - 1, rect);
		}		
	}

	onRectDown(e, rect, index) {
		e.preventDefault();
		if (index === this.props.rects.length - 1) return;
		if (this.props.onRectChange) {
			const other = this.props.rects[index + 1];
			this.props.onRectChange(index, other);
			this.props.onRectChange(index + 1, rect);
		}		
	}

	onRectDelete(e, rect, index) {
		e.preventDefault();
		if (this.props.onRectChange) {
			this.props.onRectChange(index, null);
		}		
	}

	doesNameExist(name) {
		for (let rect of this.props.rects) {
			if (rect.name === name) return true;
		}
		return false;
	}

	onNewRectangle(e) {
		e.preventDefault();
		if (this.props.rects.length >= 16) return;

		if (this.props.onRectChange) {
			// Find the next unused name.
			let nameIndex = 1;
			while (this.doesNameExist(String.fromCharCode(nameIndex + 64))) {
				nameIndex++;
			}
			const name = String.fromCharCode(nameIndex + 64);

			// Pick some random coordinates with some granularity, but don't touch the edges,
			// and make sure that top < bottom and that left < right.
			let top = Math.floor(Math.random() * 29) * 20 + 20;
			let bottom = Math.floor(Math.random() * 29) * 20 + 20;
			let left = Math.floor(Math.random() * 39) * 20 + 20;
			let right = Math.floor(Math.random() * 39) * 20 + 20;
			if (left > right) {
				const temp = left;
				left = right;
				right = temp;
			}
			else if (left === right) {
				if (left >= 780) left = right - 20;
				else right = left + 20;
			}
			if (top > bottom) {
				const temp = top;
				top = bottom;
				bottom = temp;
			}
			else if (top === bottom) {
				if (top === 580) top = bottom - 20;
				else bottom = top + 20;
			}

			// Pick a random mode.
			const kindIndex = Math.floor(Math.random() * 4);
			const kind = ["union", "intersect", "subtract", "xor"][kindIndex];

			// Add it to the next index.
			this.props.onRectChange(this.props.rects.length, {
				kind: kind, name: name,
				x: left, y: top, width: right - left, height: bottom - top
			});
		}		
	}

	getClassNameForRect(rect) {
		return rect.kind;
	}

	render() {
		return (
			<section className="editor">
				<h3>Rectangle List</h3>
				<div className="content">
					<ul className="rectangle-list">
						{this.props.rects.map((rect, index) =>
							<li key={index} className={this.getClassNameForRect(rect)}>
								<span className="index">#{index+1}.</span>
								<span className="name">{rect.name}</span>
								<select className="rect-kind" value={rect.kind} onChange={e => this.onRectKindChange(e, rect, index)} title="Click to change how this rectangle combines with the others around it">
									<option value="union">Union</option>
									<option value="intersect">Intersect</option>
									<option value="subtract">Subtract</option>
									<option value="xor">Xor</option>
								</select>
								<a className={index > 0 ? "up-button" : "up-button disabled"} href="#"
									title="Click to move this rectangle earlier in the sequence"
									onClick={e => this.onRectUp(e, rect, index)}><span className="text">Up</span></a>
								<a className={index < this.props.rects.length-1 ? "down-button" : "down-button disabled"} href="#"
									title="Click to move this rectangle later in the sequence"
									onClick={e => this.onRectDown(e, rect, index)}><span className="text">Down</span></a>
								<a className="delete-button" href="#"
									title="Click to delete this rectangle"
									onClick={e => this.onRectDelete(e, rect, index)}><span className="text">Delete</span></a>
							</li>)}
					</ul>
					<div className="actions">
						<a className="button" href="#" onClick={e => this.onNewRectangle(e)}><span className="text">Add New Rectangle</span></a>
					</div>
				</div>
			</section>
		);
	}
}
