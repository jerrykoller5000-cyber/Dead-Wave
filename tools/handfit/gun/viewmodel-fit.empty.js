// CL-334 h (Jerry, 10 Nov, J126 rule 2: "No part of the hand may clip through any part of a weapon"): each gun's first-
// person hands fitted to the gun's own shape by the grip solver (docs/fps/hand.md): per hand (r the firing hand, l the
// support) the hand's turn on the gun (basis: its x, the grip channel, and y, toward the elbow, in the gun's space), the
// point its grip channel sits on (p, the gun's space; the gun's frame keeps its VM_SOCKETS grip anchor) and its pose.
// Read before VM_SOCKETS' grip, support, gripBasis, supportBasis, gripPose and supportPose. Generated; do not edit by hand.
export const VM_FIT = Object.freeze({});
