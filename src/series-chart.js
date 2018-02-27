/**
 * A series chart is a chart that shows multiple series of data overlaid on one chart, where the
 * series is specified in the data. It is a specialization of Composite Chart and inherits all
 * composite features other than recomposing the chart.
 *
 * Examples:
 * - {@link http://dc-js.github.io/dc.js/examples/series.html Series Chart}
 * @class seriesChart
 * @memberof dc
 * @mixes dc.compositeChart
 * @example
 * // create a series chart under #chart-container1 element using the default global chart group
 * var seriesChart1 = dc.seriesChart("#chart-container1");
 * // create a series chart under #chart-container2 element using chart group A
 * var seriesChart2 = dc.seriesChart("#chart-container2", "chartGroupA");
 * @param {String|node|d3.selection} parent - Any valid
 * {@link https://github.com/d3/d3-3.x-api-reference/blob/master/Selections.md#selecting-elements d3 single selector} specifying
 * a dom block element such as a div; or a dom element or d3 selection.
 * @param {String} [chartGroup] - The name of the chart group this chart instance should be placed in.
 * Interaction with a chart will only trigger events and redraws within the chart's group.
 * @returns {dc.seriesChart}
 */
dc.seriesChart = function (parent, chartGroup) {
    var _chart = dc.compositeChart(parent, chartGroup);

    function keySort (a, b) {
        return d3.ascending(_chart.keyAccessor()(a), _chart.keyAccessor()(b));
    }

    var _charts = {};
    var _chartFunction = dc.lineChart;
    var _seriesAccessor;
    var _seriesSort = d3.ascending;
    var _valueSort = keySort;

    _chart._mandatoryAttributes().push('seriesAccessor', 'chart');
    _chart.shareColors(false);

    _chart._preprocessData = function () {
        var keep = [];
        var childrenChanged;
        var nester = d3.nest().key(_seriesAccessor);
        if (_seriesSort) {
            nester.sortKeys(_seriesSort);
        }
        if (_valueSort) {
            nester.sortValues(_valueSort);
        }
        var nesting = nester.entries(_chart.data());
        var children =
            nesting.map(function (sub, i) {
                var subChart = _charts[sub.key] || _chartFunction.call(_chart, _chart, chartGroup, sub.key, i);
                if (!_charts[sub.key]) {
                    childrenChanged = true;
                }
                _charts[sub.key] = subChart;
                keep.push(sub.key);
                return subChart
                    .dimension(_chart.dimension())
                    .group({all: d3.functor(sub.values)}, sub.key)
                    .keyAccessor(_chart.keyAccessor())
                    .valueAccessor(_chart.valueAccessor())
                    .brushOn(_chart.brushOn());
            });
        // this works around the fact compositeChart doesn't really
        // have a removal interface
        Object.keys(_charts)
            .filter(function (c) {return keep.indexOf(c) === -1;})
            .forEach(function (c) {
                clearChart(c);
                childrenChanged = true;
            });
        _chart._compose(children);
        if (childrenChanged && _chart.legend()) {
            _chart.legend().render();
        }
    };

    function clearChart (c) {
        if (_charts[c].g()) {
            _charts[c].g().remove();
        }
        delete _charts[c];
    }

    function resetChildren () {
        Object.keys(_charts).map(clearChart);
        _charts = {};
    }

    /**
     * Get or set the chart function, which generates the child charts.
     * @method chart
     * @memberof dc.seriesChart
     * @instance
     * @example
     * // put interpolation on the line charts used for the series
     * chart.chart(function(c) { return dc.lineChart(c).interpolate('basis'); })
     * // do a scatter series chart
     * chart.chart(dc.scatterPlot)
     * @param {Function} [chartFunction=dc.lineChart]
     * @returns {Function|dc.seriesChart}
     */
    _chart.chart = function (chartFunction) {
        if (!arguments.length) {
            return _chartFunction;
        }
        _chartFunction = chartFunction;
        resetChildren();
        return _chart;
    };

    /**
     * **mandatory**
     *
     * Get or set accessor function for the displayed series. Given a datum, this function
     * should return the series that datum belongs to.
     * @method seriesAccessor
     * @memberof dc.seriesChart
     * @instance
     * @example
     * // simple series accessor
     * chart.seriesAccessor(function(d) { return "Expt: " + d.key[0]; })
     * @param {Function} [accessor]
     * @returns {Function|dc.seriesChart}
     */
    _chart.seriesAccessor = function (accessor) {
        if (!arguments.length) {
            return _seriesAccessor;
        }
        _seriesAccessor = accessor;
        resetChildren();
        return _chart;
    };

    /**
     * Get or set a function to sort the list of series by, given series values.
     * @method seriesSort
     * @memberof dc.seriesChart
     * @instance
     * @see {@link https://github.com/d3/d3-3.x-api-reference/blob/master/Arrays.md#d3_ascending d3.ascending}
     * @see {@link https://github.com/d3/d3-3.x-api-reference/blob/master/Arrays.md#d3_descending d3.descending}
     * @example
     * chart.seriesSort(d3.descending);
     * @param {Function} [sortFunction=d3.ascending]
     * @returns {Function|dc.seriesChart}
     */
    _chart.seriesSort = function (sortFunction) {
        if (!arguments.length) {
            return _seriesSort;
        }
        _seriesSort = sortFunction;
        resetChildren();
        return _chart;
    };

    /**
     * Get or set a function to sort each series values by. By default this is the key accessor which,
     * for example, will ensure a lineChart series connects its points in increasing key/x order,
     * rather than haphazardly.
     * @method valueSort
     * @memberof dc.seriesChart
     * @instance
     * @see {@link https://github.com/d3/d3-3.x-api-reference/blob/master/Arrays.md#d3_ascending d3.ascending}
     * @see {@link https://github.com/d3/d3-3.x-api-reference/blob/master/Arrays.md#d3_descending d3.descending}
     * @example
     * // Default value sort
     * _chart.valueSort(function keySort (a, b) {
     *     return d3.ascending(_chart.keyAccessor()(a), _chart.keyAccessor()(b));
     * });
     * @param {Function} [sortFunction]
     * @returns {Function|dc.seriesChart}
     */
    _chart.valueSort = function (sortFunction) {
        if (!arguments.length) {
            return _valueSort;
        }
        _valueSort = sortFunction;
        resetChildren();
        return _chart;
    };

    /**
     * Add support for 2-D brushing
     */

    _chart.needed = function(){
           dc.transition(symbols, _chart.transitionDuration(), _chart.transitionDelay())
            .attr('opacity', function (d, i) {
                if (!_existenceAccessor(d)) {
                    return _emptyOpacity;
                } else if (_filtered[i]) {
                    return _nonemptyOpacity;
                } else {
                    return _chart.excludedOpacity();
                }
            });
        }
          _chart.excludedOpacity = function (excludedOpacity) {
        if (!arguments.length) {
            return _excludedOpacity;
        }
        _excludedOpacity = excludedOpacity;
        return _chart;
    };
    _chart.setHandlePaths = function () {
        // no handle paths for poly-brushes
    };

    _chart.extendBrush = function () {
        var extent = _chart.brush().extent();
        if (_chart.round()) {
            extent[0] = extent[0].map(_chart.round());
            extent[1] = extent[1].map(_chart.round());

            _chart.g().select('.brush')
                .call(_chart.brush().extent(extent));
        }
        return extent;
    };

    _chart.brushIsEmpty = function (extent) {
        return _chart.brush().empty() || !extent || extent[0][0] >= extent[1][0] || extent[0][1] >= extent[1][1];
    };
    _chart._brushEnd = function () {
        var extent = _chart.extendBrush();

        _chart.redrawBrush(_chart.g());

        if (_chart.brushIsEmpty(extent)) {
            dc.events.trigger(function () {
                _chart.filter(null);
                _chart.redrawGroup();
            });

        } else {
            var ranged2DFilter = dc.filters.RangedTwoDimensionalFilter(extent);
            _chart.ranged2DFilter = ranged2DFilter;
            dc.events.trigger(function () {
                _chart.filter(null);
                _chart.filter(ranged2DFilter);
                _chart.redrawGroup();
            }, dc.constants.EVENT_DELAY);
            //console.log(ranged2DFilter);

        }
    };
    
    _chart._brushing = function () {
        var extent = _chart.extendBrush();

        /*
        _chart.redrawBrush(_chart.g());

        if (_chart.brushIsEmpty(extent)) {
            dc.events.trigger(function () {
                _chart.filter(null);
                _chart.redrawGroup();
            });

        } else {
            var ranged2DFilter = dc.filters.RangedTwoDimensionalFilter(extent);
            _chart.ranged2DFilter = ranged2DFilter;
            dc.events.trigger(function () {
                _chart.filter(null);
                _chart.filter(ranged2DFilter);
                _chart.redrawGroup();
            }, dc.constants.EVENT_DELAY);
            //console.log(ranged2DFilter);

        }

      */
    };
     var configureMouseZoom = function(){
        var extent = _chart.extendBrush();

        _chart.redrawBrush(_chart.g());

        if (_chart.brushIsEmpty(extent)) {
            dc.events.trigger(function () {
                _chart.filter(null);
                _chart.redrawGroup();
            });

        } else {
            var ranged2DFilter = dc.filters.RangedTwoDimensionalFilter(extent);
            _chart.ranged2DFilter = ranged2DFilter;
            dc.events.trigger(function () {
                _chart.filter(null);
                _chart.filter(ranged2DFilter);
                _chart.redrawGroup();
            }, dc.constants.EVENT_DELAY);
            //console.log(ranged2DFilter);

        }


    }
     /*
    _chart.renderBrush = function (g) {
        if (_chart._brushOn) {
            _chart._brush.on('brush', _chart._brushing);
            _chart._brush.on('brushstart', _chart._disableMouseZoom);
            _chart._brush.on('brushend', configureMouseZoom);
            console.log("ye wala");
            var gBrush = g.append('g')
                .attr('class', 'brush')
                .attr('transform', 'translate(' + _chart.margins().left + ',' + _chart.margins().top + ')')
                .call(_brush.x(_chart.x()));
            _chart.setBrushY(gBrush, false);
            _chart.setHandlePaths(gBrush);

            if (_chart.hasFilter()) {
                _chart.redrawBrush(g, false);
            }
        }
    }; */    

    _chart.setBrushY = function (gBrush) {
        gBrush.call(_chart.brush().y(_chart.y()));
    };




    // make compose private
    _chart._compose = _chart.compose;
    delete _chart.compose;

    return _chart;
};
