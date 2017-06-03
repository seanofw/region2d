
import React from 'react';
import PropTypes from 'prop-types';

export default class Edge extends React.Component {
	
	static propTypes = {
		x1: PropTypes.number.isRequired,
		y1: PropTypes.number.isRequired,
		x2: PropTypes.number.isRequired,
		y2: PropTypes.number.isRequired
	}

	constructor(props) {
		super(props);
	}

	render() {
		let x1 = this.props.x1, y1 = this.props.y1;
		let x2 = this.props.x2, y2 = this.props.y2;
		if (x1 > x2) {
			const temp = x1;
			x1 = x2;
			x2 = temp;
		}
		if (y1 > y2) {
			const temp = y1;
			y1 = y2;
			y2 = temp;
		}

		return (
			<div className="edge" style={{
				left: x1 + "px",
				top: y1 + "px",
				width: (x1 !== x2 ? x2 - x1 + 1 : 2) + "px",
				height: (y1 !== y2 ? y2 - y1 + 1 : 2) + "px"
			}}></div>
		);
	}
}
