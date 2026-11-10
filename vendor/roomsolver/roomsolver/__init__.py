"""roomsolver — grade furniture-layout usability and search for the best arrangement.

Feed a room + furniture, enumerate wall placements, grade each by usability
(clearances around furniture, drawer pull-outs, doorways, walkways, and whether
you can reach each piece without squeezing), rank the best. Born from planning a
nursery, but works for any room. Everything is in INCHES internally.
"""
from .model import Room, Furniture, Zone, Placement, Layout, resolve_spec
from .scoring import grade
from .solver import solve
from . import rules

__all__ = [
    "Room", "Furniture", "Zone", "Placement", "Layout", "resolve_spec",
    "grade", "solve", "rules",
]
